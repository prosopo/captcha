import { BaseParser, ParseOptions, Parser } from "./Parser.js"

// Defers parsing until the last possible moment by wrapping a parser in a function. This allows for recursive data structure parsing.
export class LazyParser<T> extends BaseParser<T> {
    constructor(private parser: () => Parser<T>) {
        super()
    }

    override _parse(value: unknown, options?: ParseOptions): T {
        return this.parser().parse(value, options)
    }

    override validate(value: T): void {
        this.parser().validate(value)
    }
}

export const pLazy = <T>(parser: () => Parser<T>): Parser<T> => new LazyParser(parser)