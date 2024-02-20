import { Parser } from "./Parser.js"

export class LiteralParser<const T> extends Parser<T> {
    constructor(readonly value: T) {
        super()
    }

    public override parse(value: unknown): T {
        if (value !== this.value) {
            throw new Error(`Expected ${JSON.stringify(this.value)} of type ${JSON.stringify(typeof this.value)} but got ${JSON.stringify(value)} of type ${JSON.stringify(typeof value)}`)
        }
        return value as T
    }

    public override clone() {
        return new LiteralParser<T>(this.value)
    }
}

export const pLiteral = <const T>(value: T) => new LiteralParser<T>(value)
export const literal = pLiteral
export const lit = pLiteral