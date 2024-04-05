import { LiteralParser } from "./LiteralParser.js"
import { Validator } from "./Parser.js"

export class NullParser extends LiteralParser<null> {
    constructor() {
        super(null)
    }

    public override clone() {
        return new NullParser()
    }
}

export const pNull = () => new NullParser()
export const nul = pNull