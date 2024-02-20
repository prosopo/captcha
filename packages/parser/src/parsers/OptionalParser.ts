import { NestedParser, OptionalProp, Parser, Shape, optionalMarker } from "./Parser.js";

export class OptionalParser<T extends Parser<any>> extends Parser<Shape<T> | undefined> implements OptionalProp<true, T>  {
    constructor(private _parser: T) {
        super()
        this._parser = this.parser // clone parser
    }

    get parser() {
        return this._parser.clone() as T
    }

    public override parse(value: unknown): Shape<T> | undefined {
        if (value === undefined) {
            return undefined
        }
        return this._parser.parse(value)
    }

    public override clone() {
        return new OptionalParser(this._parser)
    }

    readonly [optionalMarker] = true
}

export const pOptional = <T extends Parser<any>>(parser: T) => new OptionalParser<T>(parser)
export const opt = pOptional