export const environment = {
	// biome-ignore lint/complexity/useLiteralKeys: provided by Webpack - see /webpack.config.ts
	PROCATCHA_SITE_KEY: process.env["VITE_PROCAPTCHA_SITE_KEY"] || "",
};
