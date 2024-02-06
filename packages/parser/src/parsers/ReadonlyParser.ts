import { NestedParser, Parser, ReadonlyProp, Shape } from "./Parser.js"

export class ReadonlyParser<T extends Parser<any>> extends Parser<Shape<T>> implements NestedParser<T>, ReadonlyProp<true> {
    constructor(readonly parser: T) {
        super()
    }

    public override parse(value: unknown): Shape<T> {
        return this.parser.parse(value)
    }

    public override clone() {
        return new ReadonlyParser<T>(this.parser)
    }

    readonly readonly = true
}

export const pReadonly = <T extends Parser<any>>(parser: T) => new ReadonlyParser<T>(parser)
export const ro = pReadonly