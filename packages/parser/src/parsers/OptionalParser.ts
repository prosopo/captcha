import { NestedShaper, OptionalProp, Validator, Shape, optionalMarker } from "./Parser.js";

export class OptionalParser<T extends Validator<any>> extends Validator<Shape<T> | undefined> implements OptionalProp<true, T>  {
    constructor(private _parser: T) {
        super()
        this._parser = this.parser // clone parser
    }

    get parser() {
        return this._parser.clone() as T
    }

    public override shape(value: unknown): Shape<T> | undefined {
        if (value === undefined) {
            return undefined
        }
        return this._parser.shape(value)
    }

    public override clone() {
        return new OptionalParser(this._parser)
    }

    public override get name(): string {
        return this._parser.name
    }

    readonly [optionalMarker] = true
}

export const pOptional = <T extends Validator<any>>(parser: T) => new OptionalParser<T>(parser)
export const opt = pOptional
export const optional = pOptional