import { NestedParser, Parser, ReadonlyProp, Shape } from "./Parser.js";

export class ReadWriteParser<T extends Parser<any>> extends Parser<Shape<T>> implements ReadonlyProp<false, T> {
    constructor(readonly parser: T) {
        super()
    }

    public override parse(value: unknown): Shape<T> {
        return this.parser.parse(value)
    }

    public override clone() {
        return new ReadWriteParser(this.parser)
    }

    readonly readonly = false
}

export const pReadWrite = <T extends Parser<any>>(parser: T) => new ReadWriteParser<T>(parser)
export const rw = pReadWrite
