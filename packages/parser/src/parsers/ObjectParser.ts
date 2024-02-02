import { get } from "@prosopo/util"
import { pNumber } from "./NumberParser.js"
import { pString } from "./StringParser.js"
import { Parser } from "./Parser.js"
import { Schema, BaseSchemaParser, Shape, Mask, PickSchema, OmitSchema, SchemaParser, PartialSchema, ExtendSchema, ReadonlySchema } from "./SchemaParser.js"
import { pBoolean } from "./BooleanParser.js"
import { Resolve } from "./utils.js"

export class ObjectParser<T extends Schema> extends BaseSchemaParser<T> {

    parse(value: unknown): Shape<T> {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            throw new Error(`Expected object but got ${JSON.stringify(value)} of type ${JSON.stringify(typeof value)}`)
        }
        const object = value as Record<string, unknown>
        const result: any = {}
        // check every field in the schema parses
        for (const key in this.schema) {
            result[key] = get(this.schema, key).parse(object[key])
        }
        return result
    }

    public override pick<U extends Mask<T>>(mask: U): SchemaParser<PickSchema<T, U>> {
        throw new Error("Method not implemented.")
    }

    public override omit<U extends Mask<T>>(mask: U): SchemaParser<OmitSchema<T, U>> {
        throw new Error("Method not implemented.")
    }

    public override extend<U extends Schema>(schema: U): SchemaParser<ExtendSchema<T, U>> {
        throw new Error("Method not implemented.")
    }

    public override partial<U extends Mask<T>>(mask: U): SchemaParser<PartialSchema<T, U>> {
        throw new Error("Method not implemented.")
    }

    public override readonly<U extends Mask<T>>(mask: U): SchemaParser<ReadonlySchema<T, U>> {
        throw new Error("Method not implemented.")
    }

    override clone(): Parser<Shape<T>> {
        throw new Error("Method not implemented.")
    }
}

export const pObject = <T extends Schema>(schema: T) => new ObjectParser(schema)

const a1 = pObject({
    a: pString(),
    b: pNumber(),
    c: pObject({
        d: pString(),
        e: pNumber(),
    })
})
type a3 = typeof a1
type a2 = ReturnType<typeof a1.parse>
const a4 = a1.parse({})
const a5 = a1.pick({
    a: true,
    c: {
        d: true,
    }
})
type a6 = typeof a5
const a7 = a5.parse({})
const a8 = a1.omit({
    a: true,
    c: {
        d: true,
    }
})
type a9 = ReturnType<typeof a8.parse>
const a10 = a1.extend({
    e: pBoolean(),
})
type a11 = typeof a10
const a12 = a10.parse({})
const a13 = a1.partial({
    a: true,
    c: {
        d: true,
    }
})
type a14 = typeof a13
type a15 = ReturnType<typeof a13.parse>
type a16 = typeof a13.schema
const a17 = a1.readonly({
    a: true,
    c: {
        d: true,
    }
})
type a18 = Resolve<typeof a17>
type a19 = ReturnType<typeof a17.parse>

type b2 = {
    a: string,
    b: number,
    c?: boolean,
}
type b3 = {
    a: string,
    d: number,
}
type b4 = keyof b2 & keyof b3

// type Key<T, U> = U extends keyof T ? T[U] : never

// type Output<T extends Parser<any>> = T extends Parser<infer U> ? U : never

// export type PartialSchema<T extends Schema, U extends Mask<T>> = {
//     [K in keyof T]: K extends keyof U ? (Output<T[K]> extends object ? PartialSchema<, U[K]> : T[K]) : T[K]
// }

// type x1 = PartialSchema<{ a: Parser<number>, b: Parser<string> }, { a: true }>

// const a = pObject({
//     a: pString(),
//     b: pNumber(),
// })
// const b = a.partial({
//     a: true
// })
// type c = ReturnType<typeof b.parse>
// const d = a.omit({
//     a: {
//         b: true
//     }
// })
// type e = ReturnType<typeof d.parse>
// type f = Partial<{ a: { b: number } }>

// export type RequiredSchema<T extends Schema> = Infer<{
//     [K in keyof T]-?: T[K] extends ObjectParser<infer V> ? ObjectParser<RequiredSchema<V>> : T[K]
// }>

// export type PartialSchema<T extends Schema> = Infer<{
//     [K in keyof T]?: T[K] extends ObjectParser<infer V> ? ObjectParser<PartialSchema<V>> : T[K]
// }>

// export type RequiredSchema<T extends Schema> = Infer<{
//     [K in keyof T]-?: T[K] extends ObjectParser<infer V> ? ObjectParser<RequiredSchema<V>> : T[K]
// }>

// export type OmitSchema<T extends Schema, U extends Mask<T>> = Infer<{
//     [K in keyof T as K extends keyof U ? U[K] extends object ? K : never : K]: U[K] extends object ? T[K] extends ObjectParser<infer V> ? ObjectParser<OmitSchema<V, U[K]>> : T[K] : T[K]
// }>

// export type PickSchema<T extends Schema, U extends Mask<T>> = Infer<{
//     [K in keyof U & keyof T]: 
//         T[K] extends ObjectParser<infer V> ? 
//             ObjectParser<PickSchema<V, U[K]>>
//             : T[K]
// }>
