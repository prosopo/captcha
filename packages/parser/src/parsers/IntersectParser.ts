import { pNumber } from "./NumberParser.js"
import { ObjectParser } from "./ObjectParser.js"
import { Parser, BaseParser } from "./Parser.js"
import { pString } from "./StringParser.js"
import { UnionToIntersection } from "./utils.js"

export type ParserShapeIntersect<T> = T extends [Parser<infer U>, ...infer V] ? UnionToIntersection<U | ParserShapeIntersect<V>> : never

export class IntersectParser<const T extends Parser<unknown>[]> implements BaseParser<ParserShapeIntersect<T>> {
    public constructor(private parsers: T) {}

    parse(value: unknown): ParserShapeIntersect<T> {
        return null!
    }   
}
export const pIntersect = <const T extends Parser<unknown>[]>(parsers: T) => new IntersectParser(parsers)