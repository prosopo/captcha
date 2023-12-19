import { BooleanParser } from "./BooleanParser.js"
import { NumberParser } from "./NumberParser.js"
import { BaseParser, ParseOptions, Parser } from "./Parser.js"
import { StringParser } from "./StringParser.js"

export type TupleElement<T> = T extends readonly [Parser<infer U>, ...infer V] ? [U, ...TupleElement<V>] : []

export class TupleParser<const T> extends BaseParser<TupleElement<T>> {
    constructor(private parsers: T) {
        super()
    }

    override parseShape(value: unknown, options?: ParseOptions): TupleElement<T> {
        throw new Error("Method not implemented.")
    }
}

// TODO finish this
const t = new TupleParser([new StringParser(), new NumberParser(), new BooleanParser()])
const t2 = t.parse(['hello', 1, true])

export const pTuple = <const T, U extends T[]>(...parsers: U): Parser<TupleElement<U>> => new TupleParser(parsers) // TODO check generics work here