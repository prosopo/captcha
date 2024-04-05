import { NestedValidator, Validator, ReadonlyProp, Shape, optionalMarker, readonlyMarker } from "./Parser.js"

export class ReadonlyParser<T extends Validator<any>> extends Validator<Shape<T>> implements ReadonlyProp<true, T> {
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
        return new ReadonlyParser(this._parser)
    }

    public override get name(): string {
        return this._parser.name
    }

    readonly [readonlyMarker] = true
}

export const pReadonly = <T extends Validator<any>>(parser: T) => new ReadonlyParser<T>(parser)
export const ro = pReadonly
export const readonly = pReadonly