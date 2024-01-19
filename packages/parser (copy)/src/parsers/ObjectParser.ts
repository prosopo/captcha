// // import { MergeParser } from "./MergeParser.js"
// import { bool } from "prop-types"
// import { pBoolean } from "./BooleanParser.js"
// import { pNumber } from "./NumberParser.js"
// import { BaseParser, Parser, Parseable } from "./Parser.js"
// import { pString } from "./StringParser.js"

// type Entries<T> = {
//     [K in keyof T]: [K, T[K]]
// }[keyof T][]

// export interface ObjectParserOptions {
//     // what to do with extra keys on an object? e.g. if the schema is { a: number } and we're given { a: 1, b: 2 }, what should we do about the 'b' field?
//     extraProperties?: 'delete' | 'error' | 'passthrough' // undefined == passthrough
// }

// type Mask<T> = {
//     [K in keyof T]?: any
// }
// type FilterKeys<T, U extends Mask<T>> = {
//     [K in keyof T as U[K] extends true ? K : U[K] extends object ? K : never]: U[K] extends object ? FilterKeys<T[K], U[K]> : T[K]
//     }

// type Unparseable<T> = {
//     [K in keyof T]: T[K] extends ObjectParser<infer U> ? U : T[K]
// }

// export class ObjectParser<T extends {}> extends BaseParser<T> {
//     constructor(private schema: Parseable<T>, private options: ObjectParserOptions = {}) {
//         super()
//     }

//     output(): Unparseable<Parseable<T>> {
//         return null!
//     }

//     pick(mask: Mask<T>): ObjectParser<FilterKeys<T, Mask<T>>> {
//         return this
//     }

//     _parse(value: unknown): T {
//         // check runtime type
//         // null is considered an object type, but isn't an object so throw
//         if (typeof value !== 'object' || value === null) {
//             throw new Error(`Expected object but got ${typeof value}`)
//         }

//         // iterate over schema properties and parse each field
//         const entries = Object.entries(this.schema) as Entries<Parseable<T>>
//         const keys = Object.keys(value);
//         const keySet = new Set<string | number | symbol>(keys)
//         const output = value as any
//         for (const [key, subSchema] of entries) {
//             // parse the value for the key
//             output[key] = subSchema.parse(output[key])
//             // remove the key from the set of keys, it has been parsed so forget about it
//             keySet.delete(key)
//         }
//         // any keys remaining in the key set are not known according to the schema. Handle these unknown properties
//         for (const key of keySet) {
//             if (this.options.extraProperties === 'delete') {
//                 delete (output as any)[key]
//             } else if (this.options.extraProperties === 'error') {
//                 throw new Error(`unexpected property ${String(key)} found on ${value}`)
//             } else if (this.options.extraProperties === 'passthrough' || this.options.extraProperties === undefined) {
//                 // do nothing, let the value passthrough
//             } else {
//                 throw new Error(`unknown extraProperty handler: ${this.options.extraProperties}`)
//             }
//         }

//         return output as T
//     }

//     // merge<U>(parser: Parser<U>): Parser<T & U> {
//     //     return new MergeParser(this, parser)
//     // }

//     // extend<U extends {}>(schema: Parseable<U>): Parser<T & U> {
//     //     return this.merge(new ObjectParser(schema))
//     // }
// }

// export const pObject = <T extends {}>(schema: Parseable<T>): ObjectParser<T> => new ObjectParser(schema)

// type X1 = {
//     a: number,
//     b: boolean,
//     c: string,
//     d: {
//         e: number,
//         f: boolean,
//         g: string,
//     }    
// }
// type X2 = Parseable<X1>

// const d1 = pObject({
//         e: pString(),
// })
// type D1 = typeof d1.shape
// const a1 = pObject({
//     a: pString(),
//     d: d1 
// })
// type Abc1 = typeof a1
// const a2 = a1.parse({})
// type A1 = typeof a1.shape
// const a3 = a1.pick({
//     a: true,
//     d: {
//         e: true,
//         z: true
//     },
// })
// type A = typeof a3.shape
// const a4 = a3.parse({})

// const a5 = {
//     a: 'hello',
//     b: 1,
//     c: true,
//     d: {
//         e: 'hello',
//         f: 1,
//         g: true,
//     }
// }
// type A5 = typeof a5
// type A5f = FilterKeys<A5, {
//     a: true,
//     d: {
//         e: true,
//     }
// }>


