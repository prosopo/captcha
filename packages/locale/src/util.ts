
import { z } from "zod";
import translationEn from "./locales/en.json" assert { type: "json" };

export function isClientSide(): boolean {
    return !!(
        typeof window !== "undefined" &&
        window.document &&
        window.document.createElement
    );
}

type Node = | {
    [key: string]: Node | string;
} | string;

function getLeafFieldPath(obj: Node): string[] {
    if (typeof obj === "string") {
        return [];
    }

    return Object.keys(obj).reduce((arr, key) => {
        const value = obj[key];
        if (value === undefined) {
            throw new Error(`Undefined value for key ${key}`);
        }
        const children = getLeafFieldPath(value);

        return arr.concat(
            children.map((child) => {
                return `${key}.${child}`;
            }),
        );
    }, [] as string[]);
}

export const TranslationKeysSchema = z.enum(
    getLeafFieldPath(translationEn) as [string, ...string[]],
);

export type TranslationKey = z.infer<typeof TranslationKeysSchema>;
