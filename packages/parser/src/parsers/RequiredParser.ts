import { opt } from "./OptionalParser.js"
import { NestedValidator, OptionalProp, Validator, Shape, optionalMarker } from "./Parser.js"

export class RequiredParser<T extends Validator<any, any>> extends Validator<unknown, Exclude<Shape<T>, undefined>> implements OptionalProp<false, T> {
    constructor(private _parser: T) {
        super()
        this._parser = this.parser // clone parser
    }

    get parser() {
        return this._parser.clone() as T
    }

    public override validate(value: unknown): Exclude<Shape<T>, undefined> {
        if (value === undefined) {
            throw new Error(`Expected a value but got undefined`)
        }
        return this._parser.validate(value)!
    }

    public override clone() {
        return new RequiredParser(this._parser)
    }

    readonly [optionalMarker] = false

    public override get name(): string {
        return this._parser.name
    }
}

export const pRequired = <T extends Validator<any, any>>(parser: T) => new RequiredParser<T>(parser)
export const req = pRequired
export const required = pRequired