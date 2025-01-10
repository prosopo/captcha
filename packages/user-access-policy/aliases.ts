import path from "node:path";

const aliases = {
	"@api": path.resolve(__dirname, "./src/api"),
	"@blacklist": path.resolve(__dirname, "./src/blacklist"),
	"@captchaConfig": path.resolve(__dirname, "./src/captchaConfig"),
	"@rules": path.resolve(__dirname, "./src/rules"),
	"@tests": path.resolve(__dirname, "./src/tests"),
};

export { aliases };
