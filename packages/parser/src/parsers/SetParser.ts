import { inst } from "./InstanceParser.js"
import { Parser, Shape } from "./Parser.js"

export class SetParser<T extends Parser<any>> extends Parser<Set<Shape<T>>> {
    constructor(readonly parser: T) {
        super()
    }

    public override parse(value: unknown): Set<Shape<T>> {
        const valueSet = inst(Set).parse(value)
        const result = new Set<Shape<T>>()
        for (const value of valueSet) {
            // parse every value to ensure they are of the correct type
            result.add(this.parser.parse(value))
        }
        return result
    }

    public override clone() {
        return new SetParser<T>(this.parser)
    }
}

export const pSet = <T extends Parser<any>>(parser: T) => new SetParser(parser)
export const set = pSet