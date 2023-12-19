import { BaseParser, ParseOptions, Parser } from "./Parser.js"

class PromiseParser<T> extends BaseParser<Promise<T>> {
    constructor(private parser: Parser<T>) {
        super()
    }

    override _parse(value: unknown, options?: ParseOptions): Promise<T> {
        // check that the value is a promise
        if (!(value instanceof Promise)) {
            throw new Error(`Expected promise but got ${typeof value}`)
        }
        // do the parsing when the promise resolves
        return value.then((v) => this.parser.parse(v, options))
    }

    override validate(value: Promise<T>): void {
        // TODO does this make sense? think the promise thing falls apart here, need to return value?
        value.then((v) => this.parser.validate(v))
    }
}

export const pPromise = <T>(parser: Parser<T>): Parser<Promise<T>> => new PromiseParser(parser)