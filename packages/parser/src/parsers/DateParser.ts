import { InstanceParser } from "./InstanceParser.js"
import { Validator } from "./Parser.js"
import { Ctor } from "./utils.js"

export class DateParser extends InstanceParser<Ctor<Date>> {
    constructor() {
        super(Date)
    }

    public override clone() {
        return new DateParser()
    }
}

export const pDate = () => new DateParser()
export const date = pDate