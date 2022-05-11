const mongoose = require("mongoose");
const { Schema } = mongoose;

const tracksSchema = new Schema(
	{
		name: {
			type: String,
			required: true,
			trim: true,
		},
		artist: {
			type: String,
			required: true,
			trim: true,
		},
		album: {
			type: String,
		},
		cover: {
			type: String,
		},
		url: {
			type: String,
			required: true
		},
		uploadedByUser: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
	},
	{ collection: "tracks", timestamps: true }
);

module.exports = mongoose.model("Track", tracksSchema)