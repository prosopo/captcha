import { NestedParser, Parser, ReadonlyProp, Shape } from "./Parser.js"

export class ReadonlyParser<T extends Parser<U>, U> extends Parser<U> implements NestedParser<T>, ReadonlyProp<true> {
    constructor(readonly parser: T) {
        super()
    }

    public override parse(value: unknown): U {
        return this.parser.parse(value)
    }

    public override clone() {
        return new ReadonlyParser<T, U>(this.parser)
    }

    readonly readonly = true
}

export const pReadonly = <T extends Parser<any>>(parser: T) => new ReadonlyParser<T, Shape<T>>(parser)
export const ro = pReadonly