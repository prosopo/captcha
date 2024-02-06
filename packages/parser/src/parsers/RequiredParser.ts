import { NestedParser, OptionalProp, Parser } from "./Parser.js"

export class RequiredParser<T extends Parser<U>, U> extends Parser<Exclude<U, undefined>> implements NestedParser<T>, OptionalProp<false> {
    constructor(readonly parser: T) {
        super()
    }

    public override parse(value: unknown): Exclude<U, undefined> {
        if (value === undefined) {
            throw new Error(`Expected a value but got undefined`)
        }
        return this.parser.parse(value) as Exclude<U, undefined>
    }

    public override clone() {
        return new RequiredParser<T, U>(this.parser)
    }

    readonly optional = false

}

export const pRequired = <T extends Parser<U>, U>(parser: T) => new RequiredParser<T, U>(parser)
export const req = pRequired