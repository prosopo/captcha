import { Validator } from "./Parser.js"
import { TypeofParser } from "./TypeofParser.js"


export class BooleanParser extends TypeofParser<boolean, "boolean"> {
    constructor() {
        super("boolean")
    }

    public override clone() {
        return new BooleanParser()
    }
}

export const pBoolean = () => new BooleanParser()
export const bool = pBoolean
export const boolean = pBoolean