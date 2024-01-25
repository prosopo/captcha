import { BaseParser, Parser } from "./Parser.js";

export class OptionalParser<T> extends BaseParser<T | undefined> {
    constructor(private parser: Parser<T>) {
        super()
    }

    parse(value: unknown): T | undefined {
        if (value === undefined) {
            return undefined
        }
        return this.parser.parse(value)
    }

    override clone(): Parser<T | undefined> {
        return pOptional(this.parser.clone())
    }
}

export const pOptional = <T>(parser: Parser<T>) => new OptionalParser(parser)