const Dotenv = require("dotenv-webpack");
const path = require("node:path");

module.exports = {
	plugins: [
		new Dotenv({
			path: path.resolve(__dirname, "../../.env"),
		}),
	],
};
