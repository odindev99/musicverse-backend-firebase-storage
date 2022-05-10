const expres = require("express");
const router = expres.Router();
const usersControllers = require("./usersControllers");
const isAuth = require("../../middlewares/isAuth");
const {
	uploadUserAvatarMiddlerwate,
} = require("../../middlewares/multerMiddlewares");

router.post("/singin", usersControllers.singin);
router.get("/verify-account/:token", usersControllers.verifyAccount);
router.post("/login", usersControllers.login);
router.get("/verify-token", isAuth, usersControllers.verifyToken);
router.post(
	"/resend-verification-token",
	usersControllers.resendVerificationToken
);
router.post(
	"/send-password-recovery-token",
	usersControllers.sendPasswordRecoveryToken
);
router.get(
	"/tracks-and-playlist-quantities",
	isAuth,
	usersControllers.tracksAndPlaylistsQuantities
);
router.patch("/update-password", usersControllers.updatePassword);
router.post("/set-liked-track", isAuth, usersControllers.setLikedTrack);
router.delete("/remove-liked-track", isAuth, usersControllers.removeLikedTrack);
router.get("/get-liked-tracks", isAuth, usersControllers.getLikedTracks);
router.get("/get-uploaded-tracks", isAuth, usersControllers.getUploadedTracks);
router.patch(
	"/upload-user-avatar",
	[isAuth, uploadUserAvatarMiddlerwate.single("avatar")],
	usersControllers.uploadUserAvatar
);
router.patch("/change-username", isAuth, usersControllers.changeUsername);
router.patch("/change-email", isAuth, usersControllers.changeEmail);
router.patch("/confirm-new-email/:token", usersControllers.confirmEmailChange);
router.patch(
	"/send-delete-account-token",
	isAuth,
	usersControllers.sendDeleteAccountToken
);
router.delete(
	"/delete-account",
	isAuth,
	usersControllers.confirmAccountDeletion
);

module.exports = router;
