const throwError = (message, statusCode) => {
	const error = new Error(message);

	if (statusCode) {
		error.status = statusCode;
	}

	throw error;
};

module.exports =  throwError ;
