import { LiteralParser } from "./LiteralParser.js"
import { Validator } from "./Parser.js"

export class UndefinedParser extends LiteralParser<undefined> {

    constructor() {
        super(undefined)
    }

    public override clone() {
        return new UndefinedParser()
    }
}

export const pUndefined = () => new UndefinedParser()
export const undef = pUndefined