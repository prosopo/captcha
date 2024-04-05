import { Validator } from "./Parser.js"
import { TypeofParser } from "./TypeofParser.js"

export class StringParser extends TypeofParser<string, "string"> {
    constructor() {
        super("string")
    }

    public override clone() {
        return new StringParser()
    }
}

export const pString = () => new StringParser()
export const str = pString
export const string = pString