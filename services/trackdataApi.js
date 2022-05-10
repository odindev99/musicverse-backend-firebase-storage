const axios = require("axios");

const getTrackData = async (trackName, trackArtist) => {
	const apiKey = process.env.LAST_FM_API_KEY;

	const urlToFecth = `https://ws.audioscrobbler.com/2.0/?method=track.getInfo&api_key=${apiKey}&artist=${trackArtist}&track=${trackName}&format=json`;

	const res = await axios.get(urlToFecth);

	return res.data.track;
};

module.exports = getTrackData;
