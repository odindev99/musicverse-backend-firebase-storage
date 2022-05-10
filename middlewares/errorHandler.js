const errorHanlder = (error, req, res, next) => {
	console.log(error);
	const status = error.status || 500;
	const message = error.message || 'Server error, please try again';
	res.status(status).json({ message });
};

module.exports = errorHanlder;
