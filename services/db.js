const mongoose = require("mongoose");

const connectDb = async () => {
	try {
		await mongoose.connect(
			`${process.env.DB_CONNECTION}/musicverse?retryWrites=true&w=majority`
		);
		console.log("Db connected");
	} catch (error) {
		console.log(error)
		console.log("Db failed connection");
	}
};

connectDb();
