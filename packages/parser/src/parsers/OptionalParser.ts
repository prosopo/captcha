import { NestedParser, OptionalProp, Parser, Shape } from "./Parser.js";

export class OptionalParser<T extends Parser<any>> extends Parser<Shape<T> | undefined> implements OptionalProp<true, T>  {
    constructor(readonly parser: T) {
        super()
    }

    public override parse(value: unknown): Shape<T> | undefined {
        if (value === undefined) {
            return undefined
        }
        return this.parser.parse(value)
    }

    public override clone() {
        return new OptionalParser(this.parser)
    }

    readonly optional = true
}

export const pOptional = <T extends Parser<any>>(parser: T) => new OptionalParser<T>(parser)
export const opt = pOptional