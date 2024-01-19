import { Parser, BaseParser } from "./Parser.js"
import { at } from "@prosopo/util"

export type SchemaShape<T extends readonly any[]> = T extends readonly [Parser<infer U>, ...infer V] ? [U, ...SchemaShape<V>] : []

export class TupleParser<const T extends readonly Parser<any>[], const U extends SchemaShape<T>> extends BaseParser<U> {
    constructor(private parsers: T) {
        super()
    }

    parse(value: unknown): U {
        if(!Array.isArray(value)) {
            throw new Error(`Expected array but got ${JSON.stringify(value)} of type ${JSON.stringify(typeof value)}`)
        }
        const array = value as unknown[]
        if(array.length !== this.parsers.length) {
            throw new Error(`Expected ${this.parsers.length} elements but got ${array.length}`)
        }
        return array.map((item, index) => {
            const parser = this.parsers[index]
            // TODO replace with 'at' fn once readonly version is available
            if (parser === undefined) {
                throw new Error(`No parser for index ${index}`)
            }
            return parser.parse(item)
        }) as U
    }
}

export const pTuple = <const T extends readonly Parser<any>[]>(parsers: T) => new TupleParser(parsers)