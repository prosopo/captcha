import { BooleanParser, bool } from "./BooleanParser.js"
import { never } from "./NeverParser.js"
import { NumberParser, num } from "./NumberParser.js"
import { Parser, Shape } from "./Parser.js"
import { StringParser, str } from "./StringParser.js"

export type UnionParserArray<T> = T extends [Parser<infer A>, ...infer B] ? A | UnionParserArray<B> : never

export class UnionParser<const T extends Parser<any>[]> extends Parser<UnionParserArray<T>> {

    constructor(readonly parsers: T) {
        super()
    }

    public override parse(value: unknown): UnionParserArray<T> {
        if(this.parsers.length == 0) throw new Error("No parsers provided to union, cannot parse value")
        const errors: unknown[] = []
        for (const parser of this.parsers) {
            try {
                return parser.parse(value)
            } catch (error) {
                errors.push(error)
            }
        }
        throw new Error(`Expected one of the following types but got ${JSON.stringify(value, null, 2)} of type ${JSON.stringify(typeof value, null, 2)}: ${errors.map(error => String(error) ).join("\n")}`)
    }

    public override clone() {
        return new UnionParser<T>(this.parsers)
    }
}

export const pUnion = <const T extends Parser<any>[]>(parsers: T) => new UnionParser<T>(parsers)
export const union = pUnion
export const pOr = <T extends Parser<any>, U extends Parser<any>>(parser1: T, parser2: U) => new UnionParser([parser1, parser2])
export const or = pOr

// export type UnionPair<T, U> = Shape<T> | Shape<U>
// export class OrPair<T extends Parser<any>, U extends Parser<any>> extends Parser<UnionPair<T, U>> {
//     constructor(readonly parser1: T, readonly parser2: U) {
//         super()
//     }

//     public override parse(value: unknown): UnionPair<T, U> {
//         return null!
//     }

//     public override clone(): Parser<UnionPair<T, U>> {
//         return new OrPair(this.parser1, this.parser2)
//     }
// }

// export const pOrPair = <T extends Parser<any>, U extends Parser<any>>(parser1: T, parser2: U) => new OrPair(parser1, parser2)
// export const orPair = pOrPair
// export const unionPair = pOrPair

// type OrMany<T> = T extends [Parser<infer A>, ...infer B] ? A | OrMany<B> : never
// const f1 = <const T extends Parser<any>[]>(parsers: T) => {
//     return parsers.reduce((acc, parser) => {
//         return orPair(acc, parser)
//     }, never()) as Parser<OrMany<T>>
// }

// const a1 = orPair(str(), num())
// type t1 = ReturnType<typeof a1.parse>
// const a2 = f1([str(), num(), bool()])
// type t2 = ReturnType<typeof a2.parse>
