import i18n, { InitOptions } from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { LanguageDetector as MiddlewareLanguageDetector } from "i18next-http-middleware";
import Backend from "i18next-http-backend";

import translationEn from "./locales/en.json";
import translationSr from "./locales/sr.json";
import { isClientSide } from "./utils";

const commonOptions: InitOptions = {
  debug: false,
  fallbackLng: "en",
  resources: {
    en: {
      translation: translationEn,
    },
    sr: {
      translation: translationSr,
    },
  },
};

const reactOptions: InitOptions = {
  react: {
    useSuspense: false,
  },
};

const nodeOptions: InitOptions = {};

if (isClientSide()) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({ ...commonOptions, ...reactOptions });
} else {
  i18n
    .use(Backend)
    .use(MiddlewareLanguageDetector)
    .init({ ...commonOptions, ...nodeOptions });
}

export default i18n;
