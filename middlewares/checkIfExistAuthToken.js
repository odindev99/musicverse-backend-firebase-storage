const jwt = require("jsonwebtoken");
const User = require("../components/users/usersModel");
const throwError = require("../services/throwError");

module.exports = async (req, res, next) => {
	const authHeader = req.get("Authorization");

	if (authHeader) {
		try {
			const token = req.get("Authorization").split(" ")[1];
			const jwtSecret = process.env.JWT_SECRET;

			const decodedToken = jwt.verify(token, jwtSecret, (err, decoded) => {
				if (err) {
					err.status = 401;
					err.message =
						"Your token is expired or is invalid, please go to login and request a new token";
					throw err;
				}

				return decoded;
			});

			const logedUser = await User.findOne({ _id: decodedToken.userId });

			if (!logedUser) {
				throwError(
					`Doesn't exist a user with this credentials, please try again!`,
					404
				);
			}

			req.user = logedUser;
		} catch (error) {
			next(error);
		}
	}

	next();
};
