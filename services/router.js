const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");

const addRoutes = () => {
	const componentsPath = path.join(`${process.cwd()}`, "components");

	const components = fs.readdirSync(componentsPath);

	components.forEach((component) => {
		const routerPath = path.join(
			`${componentsPath}`,
			`${component}`,
			`${component}Router.js`
		);

		const existRouterPath = fs.existsSync(routerPath);

		if (existRouterPath) {
			router.use(`/${component}`, require(`${routerPath}`));
		}
	});
};

addRoutes();

module.exports = router;
