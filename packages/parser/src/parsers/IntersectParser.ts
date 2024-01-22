import { pNumber } from "./NumberParser.js"
import { ObjectParser, pObject } from "./ObjectParser.js"
import { BaseParser, Parser } from "./Parser.js"
import { pString } from "./StringParser.js"
import { UnionToIntersection } from "./utils.js"

export type ParserShapeIntersect<T> = T extends [Parser<infer U>, ...infer V] ? UnionToIntersection<U | ParserShapeIntersect<V>> : never
// export type ParserShapeIntersect<T> = T extends [Parser<infer U>] ? [U] : T extends [Parser<infer U>, ...infer V] ? [U, ...ParserShapeIntersect<V>] : []
// type IntersectArray<T> = T extends [] ? 3 : T extends [infer U] ? U : T extends [infer U, ...infer V] ? U & IntersectArray<V> : 2

export class IntersectParser<const T extends Parser<unknown>[]> extends BaseParser<ParserShapeIntersect<T>> {
    constructor(private parsers: T) {
        super()
    }

    override parse(value: unknown): ParserShapeIntersect<T> {
        // must match all of the parsers
        for(const parser of this.parsers) {
            value = parser.parse(value)
        }
        return value as unknown as ParserShapeIntersect<T>
    }
}

export const pIntersect = <const T extends Parser<unknown>[]>(parsers: T) => new IntersectParser(parsers)

const h: ObjectParser<{a:Parser<string>}>[] = [pObject({ a: pString() })]
const g = pIntersect(h)
// type h = ReturnType<typeof g.parse>

const a = [pObject({a: pString()}), pObject({b: pNumber()})]
const b = new IntersectParser(a)
type c = ReturnType<typeof b.parse>
type d = ParserShapeIntersect<typeof a>
type e = ParserShapeIntersect<[Parser<{ a: number }>, Parser<{
    b: string
}>]>
type f = ParserShapeIntersect<[Parser<{ a: number }>, Parser<{
    b: string
}>, Parser<{
    c: boolean
}>]>

type ElementIntersection<T> = T extends [Parser<infer U>, ...infer V] ? UnionToIntersection<U | ElementIntersection<V>> : never
const fn = <const T extends Parser<unknown>[]>(arr: T): ParserShapeIntersect<T> => {
    return null!
}
// const i = fn(['a', 1, true])
// const j = fn(['a', 1])
// const k = fn(['a'])
class m implements Parser<{ a: string }> {
    parse(value: unknown): { a: string } {
        return null!
    }   
}
class n implements Parser<{ b: number }> {
    parse(value: unknown): { b: number } {
        return null!
    }   
}
const o = new ObjectParser({ a: pString() })
const p = new ObjectParser({ b: pNumber() })
type q = ReturnType<typeof o.parse>
type r = ReturnType<typeof p.parse>
const l = fn([new m(), new n()])
const s = fn([o, p])
const t = fn([new ObjectParser({
    a: pString()
}), new ObjectParser({
    b: pNumber()
}), new ObjectParser({ c: pNumber() })])