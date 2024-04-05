import { Shaper } from "./Parser.js"
import { TypeofParser } from "./TypeofParser.js"

export class NumberParser extends TypeofParser<number, "number"> {
    constructor() {
        super("number")
    }

    public override clone() {
        return new NumberParser()
    }
}

export const pNumber = () => new NumberParser()
export const num = pNumber