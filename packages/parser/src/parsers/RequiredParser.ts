import { NestedParser, OptionalProp, Parser, Shape, optionalMarker } from "./Parser.js"

export class RequiredParser<T extends Parser<any>> extends Parser<Exclude<Shape<T>, undefined>> implements OptionalProp<false, T> {
    constructor(readonly parser: T) {
        super()
    }

    public override parse(value: unknown): Exclude<Shape<T>, undefined> {
        if (value === undefined) {
            throw new Error(`Expected a value but got undefined`)
        }
        return this.parser.parse(value)!
    }

    public override clone() {
        return new RequiredParser(this.parser)
    }

    readonly [optionalMarker] = false

}

export const pRequired = <T extends Parser<any>>(parser: T) => new RequiredParser<T>(parser)
export const req = pRequired