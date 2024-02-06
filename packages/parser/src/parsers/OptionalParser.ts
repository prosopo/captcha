import { NestedParser, OptionalProp, Parser } from "./Parser.js";

export class OptionalParser<T extends Parser<U>, U> extends Parser<U | undefined> implements NestedParser<T>, OptionalProp<true>  {
    constructor(readonly parser: T) {
        super()
    }

    public override parse(value: unknown): U | undefined {
        if (value === undefined) {
            return undefined
        }
        return this.parser.parse(value)
    }

    public override clone() {
        return new OptionalParser<T, U>(this.parser)
    }

    readonly optional = true
}

export const pOptional = <T extends Parser<U>, U>(parser: T) => new OptionalParser<T, U>(parser)
export const opt = pOptional