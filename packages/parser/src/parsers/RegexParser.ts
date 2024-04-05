import { InstanceParser } from "./InstanceParser.js"
import { Shaper } from "./Parser.js"
import { TypeofParser } from "./TypeofParser.js"
import { Ctor } from "./utils.js"

export class RegexParser extends InstanceParser<Ctor<RegExp>> {
    constructor() {
        super(RegExp)
    }

    public override clone() {
        return new RegexParser()
    }

    public override get name(): string {
        return "RegExp"
    }
}

export const pRegex = () => new RegexParser()
export const regex = pRegex
export const re = pRegex
export const regexp = pRegex