const mongoose = require("mongoose");
const { Schema } = mongoose;

const coverSchema = new Schema({
	name: {
		type: String,
		required: true,
	},
	url: {
		type: String,
		required: true,
	},
});

const tracksSchema = new Schema(
	{
		name: {
			type: String,
			required: true,
			trim: true,
		},
		description: {
			type: String,
			trim: true,
		},
		tracks: [{ type: Schema.Types.ObjectId, ref: "Track" }],
		cover: {
			type: coverSchema,
		},
		public: {
			type: Boolean,
			required: true,
		},
		createdByUser: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
	},
	{ collection: "playlists", timestamps: true }
);

module.exports = mongoose.model("Playlist", tracksSchema);
