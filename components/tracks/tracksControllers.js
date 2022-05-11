const path = require("path");
const Track = require("./tracksModel");
const getTrackData = require("../../services/trackdataApi");
const formatTrackStringToApi = require("./services/formatTrackStringToApi");
const formatTrackStringToDb = require("./services/formatTrackStringToDb");
const checkQueryNumber = require("../../services/ckeckQueryNumber");
const throwError = require("../../services/throwError");
const firebaseStorage = require("../../services/firebaseStorage");
const mongoose = require("mongoose");

exports.upload = async (req, res, next) => {
	try {
		if (!req.file) {
			throwError("You need to send a valid mp3 audio file.", 400);
		}

		const { originalname, buffer } = req.file;

		const { name, artist } = req.body;

		const formatedNameToDb = formatTrackStringToDb(name);
		const formatedArtistToDb = formatTrackStringToDb(artist);

		const formatedNameToApi = formatTrackStringToApi(name);
		const formatedArtistToApi = formatTrackStringToApi(artist);

		//# llamado a api externa para obtener cover y album de la cancion que se quiere subir
		const trackExtraInf = await getTrackData(
			formatedNameToApi,
			formatedArtistToApi
		);
		const lastField = "#text";

		const album = trackExtraInf?.album?.title;
		const cover = trackExtraInf?.album?.image[3][lastField];

		const newTrackId = new mongoose.Types.ObjectId();
		const fileName = `${newTrackId}${path.extname(originalname)}`;
		const file = firebaseStorage.file(fileName);

		//# se crea y se guarda la nueva cancion
		const newTrack = new Track({
			_id: newTrackId,
			name: formatedNameToDb,
			artist: formatedArtistToDb,
			album: album && album,
			url: file.publicUrl(),
			//# si la api externa no provee un cover se guarda como cover una url al servidor que aloje el backend apuntando al cover general guardado en la carpeta public
			cover: cover ? cover : undefined,
			uploadedByUser: req.user._id,
		});

		//# se agraga al usuario la cancion que subio
		const logedUser = req.user;
		logedUser.uploadedTracks = [...logedUser.uploadedTracks, newTrack._id];

		await Promise.all([
			file.save(buffer, { public: true }),
			newTrack.save(),
			logedUser.save(),
		]);

		return res.status(201).json({
			message: "Track uploaded successfully.",
			newTrack,
		});
	} catch (error) {
		next(error);
	}
};

exports.getTrackMp3 = async (req, res, next) => {
	try {
		const trackId = req.params.id;

		const trackFile = firebaseStorage.file(`${trackId}.mp3`);

		const [, fileInfo] = await firebaseStorage.file(`${trackId}.mp3`).get();

		res.set({
			"Content-Type": fileInfo.contentType,
			"accept-ranges": "bytes",
			"Content-Length": fileInfo.size,
		});

		return trackFile.createReadStream().pipe(res);
	} catch (error) {
		next(error);
	}
};

//* Controlador para obtener todas la canciones
exports.getTracks = async (req, res, next) => {
	try {
		const limit = req.query.limit ? +req.query.limit : undefined;
		const offset = req.query.offset ? +req.query.offset : undefined;
		const validLimit = checkQueryNumber(limit);
		const validOffset = checkQueryNumber(offset);
		//# si hay un query valido para search se hara una busqueda en base a lo solicitado si no es el caso se buscan las canciones en base a la fecha que se han creado
		const search = req.query.search;
		const toFind = search
			? { name: { $regex: new RegExp(search), $options: "i" } }
			: {};

		//# si el limite y el offset son validos se realiza la paginacion
		//# si el limite y el offset no son validos se envia las canciones con un limite de 20
		const tracks = await Track.find(toFind)
			.skip(validLimit && validOffset ? offset * limit : 0)
			.limit(validLimit && validOffset ? limit : 20)
			.sort({ createdAt: -1 });

		const loggedUser = req.user;

		//# si el usuario que solicito las tracks esta logeado se verificara cuales son las canciones que le gustan
		if (loggedUser) {
			const ckeckedUserLikedTracks = tracks.map((track) => {
				const isLiked = loggedUser.likedTracks.some((likedTrack) =>
					likedTrack.equals(track._id)
				);
				if (isLiked) {
					return { ...track._doc, isLikedByLoggedUser: true };
				}
				return { ...track._doc, isLikedByLoggedUser: false };
			});

			return res.status(200).json({
				tracks: ckeckedUserLikedTracks,
				message:
					validLimit && validOffset
						? `Sended tracks with an offset of ${offset} and a limit of ${limit}, if you want a different number of tracks send a different limit and offset values.`
						: `Sended tracks with a limit of 20, if you want a different number of tracks send a limit and offset queries with valid values.`,
			});
		}

		return res.status(200).json({
			tracks,
			message:
				validLimit && validOffset
					? `Sended tracks with an offset of ${offset} and a limit of ${limit}, if you want a different number of tracks send a different limit and offset values.`
					: `Sended tracks with a limit of 20, if you want a different number of tracks send a limit and offset queries with valid values.`,
		});
	} catch (error) {
		next(error);
	}
};

exports.download = async (req, res, next) => {
	try {
		const trackId = req.params.id;

		const track = await Track.findById(trackId);

		if (!track) {
			throwError("This track doesn't exist!", 404);
		}

		const trackFile = firebaseStorage.file(`${trackId}.mp3`);

		res.attachment(`${track.name}.mp3`);

		return trackFile.createReadStream().pipe(res);
	} catch (error) {
		next(error);
	}
};

exports.delete = async (req, res, next) => {
	try {
		const { id } = req.body;
		const user = req.user;

		//# verifico que el usuario posea el id de la cancion entre las canciones que ha subido, si no es el caso arrojo un error porque este usuario no fue el que subio la cancion
		const uploadedByUser = user.uploadedTracks.some((trackId) =>
			trackId.equals(id)
		);

		if (!uploadedByUser) {
			throwError(
				"You didn't upload this track, you can only delete tracks uploaded by you!",
				403
			);
		}

		const track = await Track.findById(id);

		if (!track) {
			throwError("There is no track with that id, please try again", 401);
		}

		const indexOfDeletedTrack = user.uploadedTracks.findIndex((trackId) =>
			trackId.equals(id)
		);

		user.uploadedTracks.splice(indexOfDeletedTrack, 1);

		await Promise.all([
			track.remove(),
			firebaseStorage.file(`${id}.mp3`).delete(),
			user.save(),
		]);

		return res.status(200).json({
			message: "Track deleted",
		});
	} catch (error) {
		next(error);
	}
};
