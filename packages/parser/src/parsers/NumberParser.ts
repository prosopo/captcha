import { ValueParser } from "./Parser.js"

export class NumberParser extends ValueParser<number> {
    parse(value: unknown): number {
        if (typeof value !== "number") {
            throw new Error(`Expected a number but got ${JSON.stringify(value)} of type ${JSON.stringify(typeof value)}`)
        }
        return value
    }

    public override clone(): NumberParser {
        return new NumberParser()
    }
}

export const pNumber = () => new NumberParser()
export const num = pNumber