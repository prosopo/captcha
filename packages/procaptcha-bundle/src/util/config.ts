import {
	EnvironmentTypesSchema,
	type ProcaptchaClientConfigOutput,
	ProcaptchaConfigSchema,
} from "@prosopo/types";

export const getConfig = (siteKey?: string): ProcaptchaClientConfigOutput => {
	if (!siteKey) {
		siteKey = process.env.PROSOPO_SITE_KEY || "";
	}

	return ProcaptchaConfigSchema.parse({
		defaultEnvironment: process.env.PROSOPO_DEFAULT_ENVIRONMENT
			? EnvironmentTypesSchema.parse(process.env.PROSOPO_DEFAULT_ENVIRONMENT)
			: EnvironmentTypesSchema.enum.development,
		userAccountAddress: "",
		account: {
			address: siteKey,
		},
		serverUrl: process.env.PROSOPO_SERVER_URL || "",
		mongoAtlasUri: process.env.PROSOPO_MONGO_EVENTS_URI || "",
		devOnlyWatchEvents: process.env._DEV_ONLY_WATCH_EVENTS === "true" || false,
	});
};

export const getProcaptchaScript = (name: string) =>
	document.querySelector<HTMLScriptElement>(`script[src*="${name}"]`);

export const extractParams = (name: string) => {
	const script = getProcaptchaScript(name);
	if (script && script.src.indexOf(`${name}`) !== -1) {
		const params = new URLSearchParams(script.src.split("?")[1]);
		return {
			onloadUrlCallback: params.get("onload") || undefined,
			renderExplicit: params.get("render") || undefined,
		};
	}
	
	return { onloadUrlCallback: undefined, renderExplicit: undefined };
};
