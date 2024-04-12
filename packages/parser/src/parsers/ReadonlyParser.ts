import { NestedValidator, Validator, ReadonlyProp, Shape, optionalMarker, readonlyMarker } from "./Parser.js"

export class ReadonlyParser<T extends Validator<unknown, unknown>> extends Validator<unknown, Shape<T>> implements ReadonlyProp<true, T> {
    constructor(private _parser: T) {
        super()
        this._parser = this.parser // clone parser
    }

    get parser() {
        return this._parser.clone() as T
    }

    public override validate(value: unknown): Shape<T> {
        return this._parser.validate(value) as Shape<T>
    }

    public override clone() {
        return new ReadonlyParser(this._parser)
    }

    public override get name(): string {
        return this._parser.name
    }

    readonly [readonlyMarker] = true
}

export const pReadonly = <T extends Validator<unknown, unknown>>(parser: T) => new ReadonlyParser<T>(parser)
export const ro = pReadonly
export const readonly = pReadonly