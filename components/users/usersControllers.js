const User = require("./usersModel");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const {
	sgMail,
	fromEmail,
	registrationTemplateId,
	frontendUrl,
	passwordRecoveryTemplateId,
	emailChangeTemplateId,
	deleteAccountTemplateId,
} = require("../../services/sgMail");
const throwError = require("../../services/throwError");
const multer = require("multer");
const { nanoid } = require("nanoid");
const checkQueryNumber = require("../../services/ckeckQueryNumber");
const path = require("path");
const firebaseStorage = require("../../services/firebaseStorage");

//* Controlador para registro de usuario
exports.singin = async (req, res, next) => {
	const { username, email, password } = req.body;

	try {
		//# se valida que no existan usuarios con el email o username enviado
		const existingEmail =
			(await User.countDocuments({ email })) === 0 ? false : true;

		const existingUsername =
			(await User.countDocuments({ username })) === 0 ? false : true;

		if (existingEmail || existingUsername) {
			const errorMessage = existingEmail
				? "Alredy exist a user with this email, if you need a new verification token go to login"
				: "Alredy exist a user with this username, if you need a new verification token go to login";

			const error = new Error(errorMessage);

			error.status = 401;

			throw error;
		}

		//# Se encripta la contraseña y el token de confirmacion que le llegara al correo del usuario
		const encryptPassword = await bcrypt.hash(password, 10);

		const jwtSecret = process.env.JWT_SECRET;

		const confirmationToken = jwt.sign({ username, email }, jwtSecret, {
			expiresIn: "2h",
		});

		//# Se guarda el usuario en la db
		const newUser = new User({
			username,
			email,
			password: encryptPassword,
			confirmationToken,
		});

		await newUser.save();

		//# Se envia el correo al usuario para que verifique su cuenta
		await sgMail.send({
			from: fromEmail,
			to: email,
			dynamicTemplateData: {
				username: newUser.username,
				link: `${frontendUrl}/auth/verify-account/${confirmationToken}/`,
			},
			templateId: registrationTemplateId,
		});

		res.status(201).json({
			message: "User created, please verify account!",
		});
	} catch (error) {
		next(error);
	}
};

//* Controlado para verificar cuenta de usuario
exports.verifyAccount = async (req, res, next) => {
	try {
		const { token } = req.params;
		const jwtSecret = process.env.JWT_SECRET;

		const verifiedToken = jwt.verify(token, jwtSecret, function (err, decoded) {
			if (err) {
				err.status = 401;
				err.message =
					"Your token is expired or is invalid, please go to login and request a new token";
				throw err;
			}

			return decoded;
		});

		const { username } = verifiedToken;

		const user = await User.findOne({ username });

		if (!user) {
			const error = new Error("Doesn't exist a user with this token");
			error.status = 401;
			throw error;
		}

		if (user.verified) {
			const error = new Error("User already verified, please login");
			error.status = 401;
			throw error;
		}
		if (token !== user.confirmationToken) {
			const error = new Error(
				"Wrong token, please go to login and request a new token!"
			);
			error.status = 401;
			throw error;
		}

		user.confirmationToken = undefined;
		user.verified = true;

		await user.save();

		return res.status(200).json({
			message: "Verified user ",
		});
	} catch (error) {
		next(error);
	}
};

//* Controlador para reenviar token de verificacion de usuario
exports.resendVerificationToken = async (req, res, next) => {
	try {
		//# Se recibe el correo y la contraseña por el body
		const { email, password } = req.body;

		//# verifico si existe algun usuario con ese correo, si no existe arrojo un error
		const user = await User.findOne({ email });

		if (!user) {
			const error = new Error(
				"Doen't exist a user with this email, please try again with other email"
			);

			error.status = 404;

			throw error;
		}

		//# Se verifica si el email enviado corresponde a un usuario que ya este verificado, si es el caso arrojo un error
		if (user.verified) {
			const error = new Error("This user is already verified, please login");

			error.status = 404;

			throw error;
		}

		//# si existe algun usuario con el correo enviado se procede a verificar la contraseña enviada, si la contraseña es incorrecta arrojo un error
		const rightPassword = await bcrypt.compare(password, user.password);

		if (!rightPassword) {
			const error = new Error("Wrong password, please try again");

			error.status = 401;

			throw error;
		}

		//# Si la contraseña es correcta creo un nuevo token de confirmacion lo agrego al usuario y envio el token al correo solicitado
		const jwtSecret = process.env.JWT_SECRET;

		const confirmationToken = jwt.sign(
			{ username: user.username, email: user.email },
			jwtSecret,
			{
				expiresIn: "2h",
			}
		);

		user.confirmationToken = confirmationToken;

		await user.save();

		//# Se envia el correo al usuario para que verifique su cuenta
		await sgMail.send({
			from: fromEmail,
			to: email,
			dynamicTemplateData: {
				username: user.username,
				link: `${frontendUrl}/auth/verify-account/${confirmationToken}/`,
			},
			templateId: registrationTemplateId,
		});

		return res.status(200).json({
			message: "Token sended ",
		});
	} catch (error) {
		next(error);
	}
};

//* Login Controller
exports.login = async (req, res, next) => {
	const { email, password } = req.body;

	try {
		const existUser = await User.findOne({ email });

		if (!existUser) {
			const error = new Error("Doesn't exist a user with this email");
			error.status = 401;
			throw error;
		}

		if (!existUser.verified) {
			const error = new Error(
				"Your account has not been verified, please verify your account"
			);
			error.status = 401;
			throw error;
		}

		const rightPassword = await bcrypt.compare(password, existUser.password);

		if (!rightPassword) {
			const error = new Error("Wrong password try again");
			error.status = 401;
			throw error;
		}

		const jwtSecret = process.env.JWT_SECRET;

		const { username, _id, avatar } = existUser;

		const token = jwt.sign(
			{
				userId: _id,
				username,
				email,
			},
			jwtSecret,
			{ expiresIn: "12h" }
		);

		res.status(202).json({
			message: "Succesfuly login",
			user: {
				username,
				email,
				userId: _id,
				avatar,
			},
			token,
		});
	} catch (error) {
		next(error);
	}
};

//* Controlador para verificar token de sesion de usuario
exports.verifyToken = async (req, res, next) => {
	try {
		const user = req.user;

		const { username, _id, avatar, email } = user;

		res.status(202).json({
			message: "Valid Token",
			user: {
				username,
				email,
				userId: _id,
				avatar,
			},
		});
	} catch (error) {
		next(error);
	}
};

//* Controlador para enviar por correo token para cambio de contraseña
exports.sendPasswordRecoveryToken = async (req, res, next) => {
	try {
		//# recibo el email del usuario en el body
		const { email } = req.body;

		//# verifico que exista un usuario con este email, si no existe el usuario arrojo un error
		const user = await User.findOne({ email });

		if (!user) {
			throwError(
				"There isn't a user with this email, please try again with other email!",
				404
			);
		}

		//# genero el token de confirmacion y lo guardo en el usuario
		const jwtSecret = process.env.JWT_SECRET;

		const confirmationToken = jwt.sign(
			{ username: user.username, email: user.email },
			jwtSecret,
			{
				expiresIn: "2h",
			}
		);

		user.confirmationToken = confirmationToken;

		await user.save();

		//# le envio el correo al usuario con el token de confirmacion
		await sgMail.send({
			from: fromEmail,
			to: email,
			dynamicTemplateData: {
				username: user.username,
				link: `${frontendUrl}/auth/password-recovery/${confirmationToken}/`,
			},
			templateId: passwordRecoveryTemplateId,
		});

		//# Se envia respuesta
		return res.status(200).json({
			message: "Token sended ",
		});
	} catch (error) {
		next(error);
	}
};

//* Enpoint para obtener playlist and tracks quantities
exports.tracksAndPlaylistsQuantities = async (req, res, next) => {
	try {
		const user = req.user;
		const { uploadedTracks, likedTracks, playlists } = user;

		return res.status(200).json({
			message: "Tracks and playlists quantities sended.",
			uploadedTracksQuantity: uploadedTracks.length,
			likedTracksQuantity: likedTracks.length,
			playlistsQuantity: playlists.length,
		});
	} catch (error) {
		next(error);
	}
};

//* Controlador para cambio de contraseña
exports.updatePassword = async (req, res, next) => {
	try {
		//# Se recibe el token de recuperacion de contraseña y la nueva contraseña en el body
		const { token, newPassword } = req.body;

		//# Se verifica el token
		const jwtSecret = process.env.JWT_SECRET;

		const verifiedToken = jwt.verify(token, jwtSecret, function (err, decoded) {
			if (err) {
				err.message =
					"Your token is expired or is invalid, please go to login and request a new token";
				err.status = 401;
				throw err;
			}

			return decoded;
		});

		//# Se verifica que exista un usuario con los datos suministrados en el token, si no es el caso se arroja un error
		const { username } = verifiedToken;

		const user = await User.findOne({ username });

		if (!user) {
			throwError("Doesn't exist a user with this token", 404);
		}

		//# Se verifica que el token enviado sea el mismo que se guardo en db
		if (token !== user.confirmationToken) {
			throwError(
				"Wrong token, please go to login and request a new token!",
				401
			);
		}

		const newPasswordEqualsToOldPassword = await bcrypt.compare(
			newPassword,
			user.password
		);

		if (newPasswordEqualsToOldPassword) {
			throwError(
				"The new password cannot be the same as the old password!",
				401
			);
		}

		//# Se encripta la nueva contraseña, se guarda en el usuario y se remueve el token de confirmacion que se habia guardado en la db
		const encryptPassword = await bcrypt.hash(newPassword, 10);

		user.password = encryptPassword;

		user.confirmationToken = undefined;

		await user.save();

		//# Se envia respuesta
		return res.status(200).json({
			message: "Password updated succesfully, please login!",
		});
	} catch (error) {
		next(error);
	}
};

exports.setLikedTrack = async (req, res, next) => {
	try {
		const { trackId } = req.body;

		if (!mongoose.isValidObjectId(trackId)) {
			return res
				.status(400)
				.json({ message: "Invalid track id, please try again" });
		}

		const user = req.user;
		user.likedTracks.push(trackId);
		await user.save();

		return res.status(200).json({
			message: "Liked track added to user",
			likedTracks: user.likedTracks,
		});
	} catch (error) {
		next(error);
	}
};

exports.removeLikedTrack = async (req, res, next) => {
	try {
		const { trackId } = req.body;

		if (!mongoose.isValidObjectId(trackId)) {
			return res
				.status(400)
				.json({ message: "Invalid track id, please try again" });
		}

		const user = req.user;
		const { likedTracks } = user;
		const index = likedTracks.indexOf(trackId);
		likedTracks.splice(index, 1);

		await user.save();

		return res.status(200).json({
			message: "Removed liked track from user",
			likedTracks,
		});
	} catch (error) {
		next(error);
	}
};

exports.getLikedTracks = async (req, res, next) => {
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
		const userWithLikedTracks = await req.user.populate({
			path: "likedTracks",
			options: {
				limit: validLimit && validOffset ? limit : 20,
				skip: validLimit && validOffset ? offset * limit : 0,
				sort: { createdAt: -1 },
			},
			match: toFind,
		});

		const { likedTracks } = userWithLikedTracks;

		const withLikedByLoggedUser = likedTracks.map((track) => ({
			...track._doc,
			isLikedByLoggedUser: true,
		}));

		return res.status(200).json({
			message:
				validLimit && validOffset
					? `Sended liked tracks with an offset of ${offset} and a limit of ${limit}, if you want a different number of tracks send a different limit and offset values.`
					: `Sended tracks with a limit of 20, if you want a different number of tracks send a limit and offset queries with valid values.`,
			tracks: withLikedByLoggedUser,
		});
	} catch (error) {
		next(error);
	}
};

exports.getUploadedTracks = async (req, res, next) => {
	try {
		const limit = req.query.limit ? +req.query.limit : undefined;
		const offset = req.query.offset ? +req.query.offset : undefined;
		const validLimit = checkQueryNumber(limit);
		const validOffset = checkQueryNumber(offset);
		const user = req.user;

		//# si hay un query valido para search se hara una busqueda en base a lo solicitado si no es el caso se buscan las canciones en base a la fecha que se han creado
		const search = req.query.search;
		const toFind = search
			? { name: { $regex: new RegExp(search), $options: "i" } }
			: {};

		//# si el limite y el offset son validos se realiza la paginacion
		if (validLimit && validOffset) {
			const userWithUploadedTracks = await user.populate({
				path: "uploadedTracks",
				options: {
					limit,
					skip: limit * offset,
					sort: { createdAt: -1 },
				},
				match: toFind,
			});

			const { uploadedTracks } = userWithUploadedTracks;

			//# se verifica si de las canciones subidas por el usuario tambien han recibido like por parte de el
			const verifiedUploadedLikedTracks = uploadedTracks.map((track) => {
				const isLiked = user.likedTracks.some((likedTrack) =>
					likedTrack.equals(track._id)
				);
				if (isLiked) {
					return { ...track._doc, isLikedByLoggedUser: true };
				}
				return { ...track._doc, isLikedByLoggedUser: false };
			});

			return res.status(200).json({
				message: `Sended uploaded tracks with an offset of ${offset} and a limit of ${limit}, if you want a different number of tracks send a different limit and offset values.`,
				tracks: verifiedUploadedLikedTracks,
			});
		}

		//# si el limite y el offset no son validos se envia las canciones con un limite de 20
		const userWithUploadedTracks = await req.user.populate({
			path: "uploadedTracks",
			options: {
				limit,
				skip: offset,
				sort: { createdAt: -1 },
			},
			match: toFind,
		});

		const { uploadedTracks } = userWithUploadedTracks;

		return res.status(200).json({
			message: `Sended uploaded tracks with a limit of 20, if you want a different number of tracks send a limit and offset queries with valid values.`,
			tracks: uploadedTracks,
		});
	} catch (error) {
		next(error);
	}
};

//* Controlador para guardar avatar de usuario
exports.uploadUserAvatar = async (req, res, next) => {
	try {
		//# se recibe el cover desde multer middleware y el usuario desde isAuth middleware
		// const filename = req.file?.filename;
		const { originalname, buffer } = req.file;
		const user = req.user;

		//# se verifica si el usuario ya tenia un avatar previamente
		const previousAvatar = user?.avatar;

		//# como se va a actualizar el avatar se elimina el avatar que tenia anteriormente el usuario
		if (previousAvatar) {
			const previousAvatarName = user.avatar.name;
			await firebaseStorage.file(previousAvatarName).delete();
		}

		//# se guarda el nuevo avatar en firebase storage y se actualiza la data del usuario en la DB
		const fileId = mongoose.Types.ObjectId();
		const avatarName = `${fileId}${path.extname(originalname)}`;
		const avatarFile = firebaseStorage.file(avatarName);
		const avatarUrl = avatarFile.publicUrl();

		user.avatar = {
			name: avatarName,
			url: avatarUrl,
		};

		await Promise.all([avatarFile.save(buffer, { public: true }), user.save()]);

		return res.status(200).json({
			message: "Success uploading avatar!",
			avatar: user.avatar,
		});
	} catch (error) {
		if (error instanceof multer.MulterError) {
			error.status = 400;
		}

		next(error);
	}
};

//* Controlador para cambiar username
exports.changeUsername = async (req, res, next) => {
	try {
		//# recibo el usuario haciendo uso de isAuth middleware y recibo el nuevo username en el body
		const user = req.user;
		const { newUsername } = req.body;

		//# valido que no exista algun usuario con este username y si es el caso arrojo un error
		const existingUsername =
			(await User.countDocuments({ username: newUsername })) === 0
				? false
				: true;

		if (existingUsername) {
			throwError(
				"Already exists a user with this username, please choose another one!",
				406
			);
		}

		//# actualizo el usernanme y guardo la nueva informacion
		user.username = newUsername;
		await user.save();

		//# envio la respuesta
		return res.status(202).json({
			message: "Username updated!",
			newUsername,
		});
	} catch (error) {
		next(error);
	}
};

//* Controlador para enviar por correo token de cambio de correo
exports.changeEmail = async (req, res, next) => {
	try {
		//# recibo el nuevo email y los datos del usuario haciendo uso de isAuth middleware
		const { newEmail } = req.body;
		const user = req.user;

		//# Se valida que no exista algun usuario con el nuevo correo, si es el caso se arroja un error
		const existingEmail =
			(await User.countDocuments({ email: newEmail })) === 0 ? false : true;

		if (existingEmail) {
			throwError(
				"Alredy exist a user with this email, please try again with other email",
				406
			);
		}

		//# se genera el token de confirmacion y se guarda en el usuario
		const jwtSecret = process.env.JWT_SECRET;

		const confirmationToken = jwt.sign(
			{ username: user.username, newEmail },
			jwtSecret,
			{
				expiresIn: "2h",
			}
		);

		user.confirmationToken = confirmationToken;

		await user.save();

		//# se envia correo al usuario con el token de confirmacion
		await sgMail.send({
			from: fromEmail,
			to: newEmail,
			dynamicTemplateData: {
				username: user.username,
				link: `${frontendUrl}/auth/email-change/${confirmationToken}/`,
				newEmail,
			},
			templateId: emailChangeTemplateId,
		});

		//# Se envia respuesta
		return res.status(200).json({
			message: "Token sended ",
		});
	} catch (error) {
		next(error);
	}
};

exports.confirmEmailChange = async (req, res, next) => {
	try {
		const { token } = req.params;
		const jwtSecret = process.env.JWT_SECRET;

		const verifiedToken = jwt.verify(token, jwtSecret, function (err, decoded) {
			if (err) {
				err.status = 401;
				err.message =
					"Your token is expired or is invalid, please go to login and request a new token";
				throw err;
			}

			return decoded;
		});

		const { username, newEmail } = verifiedToken;

		const user = await User.findOne({ username });

		if (!user) {
			throwError("Doesn't exist a user with this token", 401);
		}

		if (token !== user.confirmationToken) {
			throwError(
				"Wrong token, please go to profile and request a new token!",
				401
			);
		}

		user.email = newEmail;
		user.confirmationToken = undefined;
		await user.save();

		return res.status(202).json({
			message: "Confirmed new email",
			newEmail,
		});
	} catch (error) {
		next(error);
	}
};

//* Controlador para enviar token para eliminar cuenta
exports.sendDeleteAccountToken = async (req, res, next) => {
	try {
		//# se recibe el email del usuario en el body
		const { email } = req.body;

		//# se verifica que exista algun usuario con ese email, si no es el caso se arroja un error
		const user = await User.findOne({ email });

		if (!user) {
			throwError("There isn't a user with this email!", 404);
		}

		//# se genera el token y luego se guarda en el usuario para confirmar la eliminacion de la cuenta
		const token = nanoid();

		user.confirmationToken = token;

		await user.save();

		//# se envia correo con el token de confirmacion
		await sgMail.send({
			from: fromEmail,
			to: user.email,
			dynamicTemplateData: {
				username: user.username,
				token,
			},
			templateId: deleteAccountTemplateId,
		});

		//# se envia respuesta
		return res.status(200).json({
			message: `Account deletion token was sended to ${user.email}`,
		});
	} catch (error) {
		next(error);
	}
};

//* Controlador para confirmar eliminacion de cuenta
exports.confirmAccountDeletion = async (req, res, next) => {
	try {
		//# recibo email y token de confirmacion del usuario en el body
		const { email, confirmationToken } = req.body;
		//# se verifica que exista un usuario con ese email y si no es el caso se arroja un error
		const user = await User.findOne({ email });

		if (!user) {
			throwError("There isn't a user with this email!", 404);
		}

		//# se comparan el token enviado con el que tiene el usuario en la db, si son iguales se procede a eliminar la cuenta si no son iguales se arroja un error
		if (confirmationToken !== user.confirmationToken) {
			throwError("Wrong token, please request a new token!", 406);
		}

		await user.remove();

		//# se envia respuesta
		return res.status(200).json({
			message: `${user.username} account was deleted`,
		});
	} catch (error) {
		next(error);
	}
};
