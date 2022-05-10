function formatTrackStringToApi(trackString = "believer") {
	const capitalizeTrackName = trackString.replace(/\w\S*/g, (w) =>
		w.replace(/^\w/, (c) => c.toUpperCase())
	);

	const haveEmptySpaces = capitalizeTrackName.includes(" ");

  // console.log(haveEmptySpaces);
	if (haveEmptySpaces) {
		const replacedSpaces = capitalizeTrackName.replace(/\s/g, "+");
    // console.log(replacedSpaces);
		return replacedSpaces;
	}

	return capitalizeTrackName;
}

// formatTrackStringToApi()

module.exports = formatTrackStringToApi;
