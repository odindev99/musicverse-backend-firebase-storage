function formatTrackStringToDb(trackString = "believer") {
	const capitalizeTrackName = trackString
		.trim()
		.replace(/\w\S*/g, (w) => w.replace(/^\w/, (c) => c.toUpperCase()));

	return capitalizeTrackName;
}

// formatTrackStringToDb()

module.exports = formatTrackStringToDb;
