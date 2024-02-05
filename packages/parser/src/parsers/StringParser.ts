import { Parser } from "./Parser.js"

export class StringParser extends Parser<string> {
    public override parse(value: unknown): string {
        if (typeof value !== "string") {
            throw new Error(`Expected a string but got ${JSON.stringify(value)} of type ${JSON.stringify(typeof value)}`)
        }
        return value
    }

    public override clone() {
        return new StringParser()
    }
}

export const pString = () => new StringParser()
export const str = pString