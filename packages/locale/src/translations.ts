import z from "zod";
import translationsEn from "./locales/en.json" assert { type: "json" }
import translationsEs from "./locales/es.json" assert { type: "json" }
import translationsPt from "./locales/pt.json" assert { type: "json" }
import translationsPtBR from "./locales/pt-BR.json" assert { type: "json" }

export const LanguageSchema = z.enum(["en", "es", "pt", "pt-BR"]);

export const translations = {
    [LanguageSchema.enum.en]: {translation: translationsEn},
    [LanguageSchema.enum.es]: {translation:translationsEs},
    [LanguageSchema.enum.pt]: {translation:translationsPt},
    [LanguageSchema.enum["pt-BR"]]: {translation:translationsPtBR},
}
