import { FieldParser, ValueParser } from "./Parser.js"


export class BooleanParser extends ValueParser<boolean> {
    public override parse(value: unknown): boolean {
        if (typeof value !== "boolean") {
            throw new Error(`Expected a boolean but got ${JSON.stringify(value)} of type ${JSON.stringify(typeof value)}`)
        }
        return value
    }

    public override clone() {
        return new BooleanParser()
    }
}

export const pBoolean = () => new BooleanParser()
export const bool = pBoolean