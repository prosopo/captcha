import { BaseParser, Parser } from "./Parser.js";

export class LiteralParser<const T> extends BaseParser<T> {
    constructor(private value: T) {
        super()
    }

    parse(value: unknown): T {
        if (value !== this.value) {
            throw new Error(`Expected ${JSON.stringify(this.value)} of type ${JSON.stringify(typeof this.value)} but got ${JSON.stringify(value)} of type ${JSON.stringify(typeof value)}`)
        }
        return this.value
    }

    override clone(): Parser<T> {
        return pLiteral(this.value)
    }
}

export const pLiteral = <const T>(value: T) => new LiteralParser(value)