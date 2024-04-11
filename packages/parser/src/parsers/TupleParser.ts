// import { at, get } from "@prosopo/util"
// import { Validator, Shape } from "./Parser.js"
// import { bool } from "./BooleanParser.js"
// import { num } from "./NumberParser.js"
// import { str } from "./StringParser.js"
// import { inst } from "./InstanceParser.js"

// export type ShapeArray<T> = T extends [infer A, ...infer B] ? [Shape<A>, ...ShapeArray<B>] : []

// export class TupleParser<const T extends Validator<any>[]> extends Validator<{
//     output: ShapeArray<T>
// }> {

//     constructor(private _parsers: T) {
//         super()
//         this._parsers = this.parsers // clone parsers
//     }

//     get parsers() {
//         return this._parsers.map(parser => parser.clone()) as T
//     }

//     public override validate(value: unknown): ShapeArray<T> {
//         const valueArray = inst(Array).validate(value)
//         if (valueArray.length !== this._parsers.length) {
//             throw new Error(`Expected tuple with ${this._parsers.length} elements but got ${valueArray.length} elements`)
//         }
//         for (let i = 0; i < valueArray.length; i++) {
//             // parse each element
//             const parser = at(this._parsers, i)
//             valueArray[i] = parser.validate(valueArray[i])
//         }
//         return value as ShapeArray<T>
//     }

//     public override clone() {
//         return new TupleParser<T>(this._parsers)
//     }

//     public override get name(): string {
//         return `[${this._parsers.map(parser => parser.name).join(", ")}]`
//     }
// }

// export const pTuple = <const T extends Validator<any>[]>(parsers: T) => new TupleParser<T>(parsers)
// export const tuple = pTuple
// export const tup = pTuple
