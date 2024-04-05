import { opt } from "./OptionalParser.js"
import { NestedParser, OptionalProp, Parser, Shape, optionalMarker } from "./Parser.js"

export class RequiredParser<T extends Parser<any>> extends Parser<Exclude<Shape<T>, undefined>> implements OptionalProp<false, T> {
    constructor(private _parser: T) {
        super()
        this._parser = this.parser // clone parser
    }

    get parser() {
        return this._parser.clone() as T
    }

    public override shape(value: unknown): Exclude<Shape<T>, undefined> {
        if (value === undefined) {
            throw new Error(`Expected a value but got undefined`)
        }
        return this._parser.shape(value)!
    }

    public override clone() {
        return new RequiredParser(this._parser)
    }

    readonly [optionalMarker] = false

    public override get name(): string {
        return this._parser.name
    }
}

export const pRequired = <T extends Parser<any>>(parser: T) => new RequiredParser<T>(parser)
export const req = pRequired
export const required = pRequired