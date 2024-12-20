import type { ProsopoConfigOutput } from "@prosopo/types";

export const checkLangRules = (
	config: ProsopoConfigOutput,
	acceptLanguage: string,
): number => {
	const lConfig = config.lRules;
	let lScore = 0;
	if (lConfig) {
		const languages = acceptLanguage
			.split(",")
			.map((lang) => lang.trim().split(";")[0]);

		for (const lang of languages) {
			if (lang && lConfig[lang]) {
				lScore += lConfig[lang];
			}
		}
	}
	return lScore;
};
