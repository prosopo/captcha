import { at, get } from "@prosopo/util"
import { Parser, Shape } from "./Parser.js"
import { bool } from "./BooleanParser.js"
import { num } from "./NumberParser.js"
import { str } from "./StringParser.js"

export type ShapeArray<T> = T extends [infer A, ...infer B] ? [Shape<A>, ...ShapeArray<B>] : []

export class TupleParser<const T extends Parser<any>[]> extends Parser<ShapeArray<T>> {

    constructor(readonly parsers: T) {
        super()
    }

    public override parse(value: unknown): ShapeArray<T> {
        if (value === null) {
            throw new Error(`Expected tuple but got null`)
        }
        if (!Array.isArray(value)) {
            throw new Error(`Expected tuple but got ${JSON.stringify(value)} of type ${JSON.stringify(typeof value)}`)
        }
        // value is definitely an array
        const valueArray = value as unknown[]
        if (valueArray.length !== this.parsers.length) {
            throw new Error(`Expected tuple with ${this.parsers.length} elements but got ${valueArray.length} elements`)
        }
        for (let i = 0; i < valueArray.length; i++) {
            // parse each element
            const parser = at(this.parsers, i)
            valueArray[i] = parser.parse(valueArray[i])
        }
        return value as ShapeArray<T>
    }

    public override clone() {
        return new TupleParser<T>(this.parsers)
    }
}

export const pTuple = <const T extends Parser<any>[]>(parsers: T) => new TupleParser<T>(parsers)
export const tuple = pTuple
export const tup = pTuple
