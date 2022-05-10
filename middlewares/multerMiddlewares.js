const multer = require("multer");
const Track = require("../components/tracks/tracksModel");

//! Filters

//* Filtrado de canciones
const tracksFilter = async (req, file, cb) => {
	if (file.mimetype !== "audio/mpeg") {
		return cb(
			new Error("Wrong file type, you can only upload mp3 audio files.")
		);
	}

	const { name, artist } = req.body;

	const alredyExistsSong =
		(await Track.countDocuments({ name, artist })) === 0 ? false : true;

	if (alredyExistsSong) {
		return cb(new Error("This track already exist!"));
	}

	if (!name || !artist) {
		return cb(
			new Error(
				"Lack of information in body, you need to provide a valid name and artist!"
			)
		);
	}

	cb(null, true);
};

//* Filtrado para los archivos que seran imagenes
const imagesFilter = (req, file, cb) => {
	if (file) {
		if (
			file.mimetype !== "image/png" &&
			file.mimetype !== "image/jpeg" &&
			file.mimetype !== "image/webp"
		) {
			// console.log(file.mimetype);
			cb(
				new Error(
					"Wrong file type, you can only upload images with these extensions: png, jpg or webp"
				)
			);
		} else if (file.size > 5242880) {
			cb(new Error("You can not upload files larger than 5mb in size"));
		} else {
			cb(null, true);
		}
	}

	cb(null, false);
};

//! Middlewares
const storage = multer.memoryStorage();

const uploadTrackMiddleware = multer({
	fileFilter: tracksFilter,
	storage,
	limits: { fileSize: 12582912 },
});

const uploadPlaylistCoverMiddleware = multer({
	fileFilter: imagesFilter,
	storage,
	limits: { fileSize: 12582912 },
});

const uploadUserAvatarMiddlerwate = multer({
	fileFilter: imagesFilter,
	storage,
	limits: { fileSize: 12582912 },
});

module.exports = {
	uploadTrackMiddleware,
	uploadPlaylistCoverMiddleware,
	uploadUserAvatarMiddlerwate,
};
