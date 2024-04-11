import { NestedValidator, Validator, ReadonlyProp, Shape, readonlyMarker } from "./Parser.js";

export class ReadWriteParser<T extends Validator<any, any>> extends Validator<unknown, Shape<T>> implements ReadonlyProp<false, T> {
    constructor(private _parser: T) {
        super()
        this._parser = this.parser // clone parser
    }

    get parser() {
        return this._parser.clone() as T
    }

    public override validate(value: unknown): Shape<T> {
        return this._parser.validate(value)
    }

    public override clone() {
        return new ReadWriteParser(this._parser)
    }

    public override get name(): string {
        return this._parser.name
    }

    readonly [readonlyMarker] = false
}

export const pReadWrite = <T extends Validator<any, any>>(parser: T) => new ReadWriteParser<T>(parser)
export const rw = pReadWrite
export const readwrite = pReadWrite
