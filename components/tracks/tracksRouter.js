const express = require("express");
const router = express.Router();
const {
	uploadTrackMiddleware,
} = require("../../middlewares/multerMiddlewares");
const trackControllers = require("./tracksControllers");
const isAuth = require("../../middlewares/isAuth");
const checkIfExistAuthToken = require("../../middlewares/checkIfExistAuthToken");

router.get("/", checkIfExistAuthToken, trackControllers.getTracks);

router.post(
	"/upload",
	[isAuth, uploadTrackMiddleware.single("track")],
	trackControllers.upload
);

router.get("/:id/mp3", trackControllers.getTrackMp3);

router.get("/:id/download", trackControllers.download);

router.delete("/delete", isAuth, trackControllers.delete);

module.exports = router;
