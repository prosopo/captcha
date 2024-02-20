import { num } from "./NumberParser.js"
import { Parser } from "./Parser.js"
import { str } from "./StringParser.js"
import { Resolve, UnionToIntersection } from "./utils.js"

export type ParserArrayToShapeUnion<T> = T extends [] ? never : T extends [Parser<infer A>, ...infer B] ? A | ParserArrayToShapeUnion<B> : never
export type IntersectParserArray<T> = UnionToIntersection<ParserArrayToShapeUnion<T>>

export class IntersectParser<const T extends Parser<any>[]> extends Parser<IntersectParserArray<T>> {

    constructor(private _parsers: T) {
        super()
        this._parsers = this.parsers // clone parsers
    }

    get parsers() {
        return this._parsers.map(parser => parser.clone()) as T
    }

    public override parse(value: unknown): IntersectParserArray<T> {
        if(this._parsers.length == 0) throw new Error("No parsers provided to intersect, cannot parse value")
        const errors: unknown[] = []
        for (const parser of this._parsers) {
            // should parse in all parsers
            value = parser.parse(value)
        }
        // do it twice to ensure the value returned by the last parser is still accepted by the first
        // i.e. make sure none of the parsers have side effects which mutate the value to a point where it is no longer accepted any previous parsers
        for (const parser of this._parsers) {
            // should parse in all parsers
            value = parser.parse(value)
        }
        return value as IntersectParserArray<T>
    }

    public override clone() {
        return new IntersectParser<T>(this._parsers)
    }
}

export const pIntersect = <const T extends Parser<any>[]>(parsers: T) => new IntersectParser<T>(parsers)
export const intersect = pIntersect
export const intersection = pIntersect
export const pAnd = <T extends Parser<any>, U extends Parser<any>>(a: T, b: U) => pIntersect([a, b])
export const and = pAnd
