import path from "node:path";

const aliases = {
	"@api": path.resolve(__dirname, "./src/api"),
	"@blacklist": path.resolve(__dirname, "./src/blacklist"),
	"@imageCaptchaConfig": path.resolve(__dirname, "./src/imageCaptchaConfig"),
	"@rules": path.resolve(__dirname, "./src/rules"),
	"@tests": path.resolve(__dirname, "./src/tests"),
};

export { aliases };
