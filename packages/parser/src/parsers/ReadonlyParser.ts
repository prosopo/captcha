import { NestedParser, Parser, ReadonlyProp, Shape, optionalMarker, readonlyMarker } from "./Parser.js"

export class ReadonlyParser<T extends Parser<any>> extends Parser<Shape<T>> implements ReadonlyProp<true, T> {
    constructor(readonly parser: T) {
        super()
    }

    public override parse(value: unknown): Shape<T> {
        return this.parser.parse(value)
    }

    public override clone() {
        return new ReadonlyParser(this.parser)
    }

    readonly [readonlyMarker] = true
}

export const pReadonly = <T extends Parser<any>>(parser: T) => new ReadonlyParser<T>(parser)
export const ro = pReadonly