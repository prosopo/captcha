import { Parser } from "./Parser.js"
import { Resolve } from "./utils.js"

export type IntersectParserArray<T> = T extends [Parser<infer A>, ...infer B] ?  | IntersectParserArray<B> : []

export class IntersectParser<const T extends Parser<any>[]> extends Parser<IntersectParserArray<T>> {

    constructor(readonly parsers: T) {
        super()
    }

    public override parse(value: unknown): IntersectParserArray<T> {
        const errors: unknown[] = []
        for (const parser of this.parsers) {
            // should parse in all parsers
            value = parser.parse(value)
        }
        // do it twice to ensure the value returned by the last parser is still accepted by the first
        // i.e. make sure none of the parsers have side effects which mutate the value to a point where it is no longer accepted any previous parsers
        for (const parser of this.parsers) {
            // should parse in all parsers
            value = parser.parse(value)
        }
        return value as IntersectParserArray<T>
    }

    public override clone() {
        return new IntersectParser<T>(this.parsers)
    }
}

export const pIntersect = <const T extends Parser<any>[]>(parsers: T) => new IntersectParser<T>(parsers)
export const intersect = pIntersect
export const intersection = pIntersect
export const pAnd = <T extends Parser<any>, U extends Parser<any>>(a: T, b: U) => pIntersect([a, b])
export const and = pAnd