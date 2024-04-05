import { NestedParser, Parser, ReadonlyProp, Shape, readonlyMarker } from "./Parser.js";

export class ReadWriteParser<T extends Parser<any>> extends Parser<Shape<T>> implements ReadonlyProp<false, T> {
    constructor(private _parser: T) {
        super()
        this._parser = this.parser // clone parser
    }

    get parser() {
        return this._parser.clone() as T
    }

    public override shape(value: unknown): Shape<T> {
        return this._parser.shape(value)
    }

    public override clone() {
        return new ReadWriteParser(this._parser)
    }

    public override get name(): string {
        return this._parser.name
    }

    readonly [readonlyMarker] = false
}

export const pReadWrite = <T extends Parser<any>>(parser: T) => new ReadWriteParser<T>(parser)
export const rw = pReadWrite
export const readwrite = pReadWrite
