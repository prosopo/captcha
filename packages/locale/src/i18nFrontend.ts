import i18n, { type InitOptions } from "i18next";
import I18nextBrowserLanguageDetector from "i18next-browser-languagedetector";
import ChainedBackend from "i18next-chained-backend";
import HttpBackend from "i18next-http-backend";
import resourcesToBackend from "i18next-resources-to-backend";
import { initReactI18next } from "react-i18next";
import { LanguageSchema } from "./translations.js";

const reactOptions: InitOptions = {
	react: {
		useSuspense: true,
	},
	detection: {
		order: ["navigator", "htmlTag", "path", "subdomain"],
		caches: ["localStorage", "cookie"],
	},
};

i18n
	// @ts-ignore
	.use(ChainedBackend)
	.use(I18nextBrowserLanguageDetector)
	.use(initReactI18next)
	.init({
		debug: true,
		fallbackLng: LanguageSchema.enum.en,
		namespace: "translation",
		backend: {
			backends: [
				HttpBackend, // if a namespace can't be loaded via normal http-backend loadPath, then the inMemoryLocalBackend will try to return the correct resources
				// with dynamic import, you have to use the "default" key of the module ( https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import#importing_defaults )
				resourcesToBackend(
					(language: string, namespace: string) =>
						import(`./assets/locales/${language}/${namespace}.json`),
				),
			],
			backendOptions: [
				{
					loadPath: "http://localhost:9232/assets/locales/{{lng}}/{{ns}}.json",
				},
			],
		},
		...reactOptions,
	} as InitOptions);

export default i18n;
