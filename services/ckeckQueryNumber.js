const checkQueryNumber = (number) => {
	const isValidQueryNumber = !Number.isNaN(number) && number >= 0;

	return isValidQueryNumber;
};

module.exports = checkQueryNumber;
