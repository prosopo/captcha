import { NestedParser, Parser, ReadonlyProp } from "./Parser.js";

export class ReadWriteParser<T extends Parser<U>, U> extends Parser<U> implements NestedParser<T>, ReadonlyProp<false> {
    constructor(readonly parser: T) {
        super()
    }

    public override parse(value: unknown): U {
        return this.parser.parse(value)
    }

    public override clone() {
        return new ReadWriteParser<T, U>(this.parser)
    }

    readonly readonly = false
}

export const pReadWrite = <T extends Parser<U>, U>(parser: T) => new ReadWriteParser<T, U>(parser)
export const rw = pReadWrite
