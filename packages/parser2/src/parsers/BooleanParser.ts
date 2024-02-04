import { ValueParser } from "./Parser.js"


export class BooleanParser extends ValueParser<boolean> {
    parse(value: unknown): boolean {
        if (typeof value !== "boolean") {
            throw new Error(`Expected a boolean but got ${JSON.stringify(value)} of type ${JSON.stringify(typeof value)}`)
        }
        return value
    }
}

export const pBoolean = () => new BooleanParser()
