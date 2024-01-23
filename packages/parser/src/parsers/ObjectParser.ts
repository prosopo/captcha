import { get } from "@prosopo/util"
import { BaseParser, Parser } from "./Parser.js"
import { Infer, Mask, RemoveNever, Schema, Shape } from "./utils.js"
import { pNumber } from "./NumberParser.js"
import { pString } from "./StringParser.js"
import { E } from "vitest/dist/reporters-5f784f42.js"

export class ObjectParser<T extends Schema> extends BaseParser<Shape<T>> {

    constructor(readonly schema: T) {
        super()
    }

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

    // public extend<U extends Schema>(schema: U): ObjectParser<T & U> {
    //     return new ObjectParser({ ...this.schema, ...schema })
    // }

    public pick<U extends Mask<T>>(mask: U): ObjectParser<PickSchema<T, U>> {
        return null!
    }

    public omit<U extends Mask<T>> (mask: U): ObjectParser<OmitSchema<T, U>> {
        return null!
    }
}

export const pObject = <T extends Schema>(schema: T) => new ObjectParser(schema)

const a = pObject({ a: pString(), b: pNumber(), c: pObject({ d: pString(), e: pNumber() }) })
type d = ReturnType<typeof a.parse>
const b = a.pick({ a: true, c: { d: true } })
type c = ReturnType<typeof b.parse>
const e = a.omit({ b: true, c: { e: true } })
type f = ReturnType<typeof e.parse>

export type OmitSchema<T extends Schema, U extends Mask<T>> = {
    [K in keyof T as K extends keyof U ? U[K] extends object ? K : never : K]: U[K] extends object ? T[K] extends ObjectParser<infer V> ? ObjectParser<OmitSchema<V, U[K]>> : T[K] : T[K]
}

// export type OmitSchema<T extends Schema, U extends {}> = {
//     [K in keyof T as U extends {
//         [K2 in keyof T]?: any
//     } ? U[K] extends {} ? K : never : K]: U extends {
//         [K2 in keyof T]?: any
//     } ? T[K] extends ObjectParser<infer V> ? U[K] extends {
//         [K3 in keyof V]?: any
//     } ?  ObjectParser<Infer<OmitSchema<V, U[K]>>> : T[K] : never : T[K]
// }

export type PickSchema<T extends Schema, U extends Mask<T>> = {
    [K in keyof U & keyof T]: 
        T[K] extends ObjectParser<infer V> ? 
            ObjectParser<Infer<PickSchema<V, U[K]>>>
            : T[K]
}

// export type PickSchema<T extends Schema, U extends {}> = {
//     [K in keyof U & keyof T]: 
//         T[K] extends ObjectParser<infer V> ?
//             U[K] extends {
//                 [K2 in keyof V]?: any
//             } ? 
//                 ObjectParser<Infer<PickSchema<V, U[K]>>>
//                 : never
//             : T[K]
// }