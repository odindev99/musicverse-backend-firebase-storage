const removeTrackFromUserUploadedTracks = (id, array) => {
	const index = array.indexOf(id);

	array.splice(index, 1);
};

module.exports = removeTrackFromUserUploadedTracks