const express = require("express");
const router = express.Router();
const isAuth = require("../../middlewares/isAuth");
const {
	uploadPlaylistCoverMiddleware,
} = require("../../middlewares/multerMiddlewares");
const playlistsControllers = require("./playlistsControllers");
const checkIfExistAuthToken = require("../../middlewares/checkIfExistAuthToken");

router.get("/get-playlists", playlistsControllers.getPlaylists);
router.get(
	"/get-user-playlists",
	isAuth,
	playlistsControllers.getUserPlaylists
);
router.get(
	"/get-playlist-details/:playlistId",
	checkIfExistAuthToken,
	playlistsControllers.getPlaylistDetails
);
router.post(
	"/add",
	[isAuth, uploadPlaylistCoverMiddleware.single("cover")],
	playlistsControllers.addPlaylist
);
router.post("/add-track", isAuth, playlistsControllers.addPlaylistTrack);
router.patch(
	"/update/:playlistId",
	[isAuth, uploadPlaylistCoverMiddleware.single("cover")],
	playlistsControllers.updatePlaylist
);
router.patch("/remove-track", isAuth, playlistsControllers.removeTrack);
router.delete(
	"/delete/:playlistId",
	isAuth,
	playlistsControllers.deletePlaylist
);

module.exports = router;
