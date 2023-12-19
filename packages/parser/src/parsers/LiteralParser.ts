import { BaseParser, ParseOptions, Parser } from "./Parser.js"

// Parser for literal types. E.g. say my literal is 'a', then this parser will accept 'a' and nothing else. 'a' is the only valid value and is considered a symbol itself, not a string.
export class LiteralParser<T> extends BaseParser<T> {
    constructor(private literal: T) {
        super()
    }

    parseShape(value: unknown, options?: ParseOptions): T {
        if (value !== this.literal) {
            throw new Error(`Expected literal ${this.literal} but got ${value}`)
        }
        return value as T
    }
}

export const pLiteral = <T>(literal: T): Parser<T> => new LiteralParser(literal)