import { pNumber } from "./NumberParser.js"
import { ObjectParser } from "./ObjectParser.js"
import { Parser, BaseParser } from "./Parser.js"
import { pString } from "./StringParser.js"
import { UnionToIntersection } from "./utils.js"

export type ParserShapeIntersect<T> = T extends [Parser<infer U>, ...infer V] ? UnionToIntersection<U | ParserShapeIntersect<V>> : never

export class IntersectParser<const T extends Parser<unknown>[]> extends BaseParser<ParserShapeIntersect<T>> {
    public constructor(private parsers: T) {
        super()
    }

    parse(value: unknown): ParserShapeIntersect<T> {
        // parse each parser in turn, all should succeed
        // TODO don't drop extra keys per parser / find a way to restore them / merge output of all parsers
        for (const parser of this.parsers) {
            // not using the output of the parsers, just checking they don't throw
            parser.parse(value)
            // TODO merge output of all parsers?
        }
        return value as ParserShapeIntersect<T>
    }

    override clone(): Parser<ParserShapeIntersect<T>> {
        return pIntersect(this.parsers.map(parser => parser.clone()))
    }
}
export const pIntersect = <const T extends Parser<unknown>[]>(parsers: T) => new IntersectParser(parsers)