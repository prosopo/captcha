import { get } from "@prosopo/util"
import { BaseParser, Parser } from "./Parser.js"
import { Infer, Mask, Schema, Shape } from "./utils.js"
import { pNumber } from "./NumberParser.js"
import { pString } from "./StringParser.js"

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

    public extend<U extends Schema>(schema: U): ObjectParser<T & U> {
        return new ObjectParser({ ...this.clone().schema, ...schema.clone() })
    }

    public pick<U extends Mask<T>>(mask: U): ObjectParser<PickSchema<T, U>> {
        const schema: Schema = {}
        for (const key of Object.keys(mask)) {
            // if mask contains nested mask, recurse
            const subMask = get(mask, key)
            if (typeof subMask === 'object') {
                // recursively pick
                schema[key] = (this.schema[key] as ObjectParser<any>).pick(subMask)
            } else {
                // copy the parser to the new schema
                schema[key] = get(this.schema, key).clone()
            }
        }
        return new ObjectParser<PickSchema<T, U>>(schema as PickSchema<T, U>)
    }

    public omit<U extends Mask<T>>(mask: U): ObjectParser<OmitSchema<T, U>> {
        // TODO make this non-recursive
        const schema: Schema = {}
        for (const key of Object.keys(schema)) {
            if (Object.keys(mask).includes(key)) {
                // skip, we're omitting this key
            } else {
                // copy the parser to the new schema
                if (this.schema[key] instanceof ObjectParser) {
                    const subMask = get(mask, key)
                    schema[key] = (this.schema[key] as ObjectParser<any>).omit(subMask)
                } else {
                    schema[key] = get(this.schema, key).clone()
                }
            }
        }
        return new ObjectParser<OmitSchema<T, U>>(schema as OmitSchema<T, U>)
    }

    public partial<U extends Mask<T>>(mask: U): ObjectParser<PartialSchema<T, U>> {
        throw new Error("Method not implemented.")
    }

    public required(): ObjectParser<RequiredSchema<T>> {
        throw new Error("Method not implemented.")
    }

    override clone(): Parser<Shape<T>> {
        const schema = { ... this.schema }
        for (const key of Object.keys(schema)) {
            (schema as any)[key] = get(this.schema, key).clone()
        }
        return pObject(schema as T)
    }
}

export const pObject = <T extends Schema>(schema: T) => new ObjectParser(schema)

type Key<T, U> = U extends keyof T ? T[U] : never

type Output<T extends Parser<any>> = T extends Parser<infer U> ? U : never

export type PartialSchema<T extends Schema, U extends Mask<T>> = {
    [K in keyof T]: K extends keyof U ? (Output<T[K]> extends object ? PartialSchema<, U[K]> : T[K]) : T[K]
}

type x1 = PartialSchema<{ a: Parser<number>, b: Parser<string> }, { a: true }>

const a = pObject({
    a: pString(),
    b: pNumber(),
})
const b = a.partial({
    a: true
})
type c = ReturnType<typeof b.parse>
const d = a.omit({
    a: {
        b: true
    }
})
type e = ReturnType<typeof d.parse>
type f = Partial<{ a: { b: number } }>

export type RequiredSchema<T extends Schema> = Infer<{
    [K in keyof T]-?: T[K] extends ObjectParser<infer V> ? ObjectParser<RequiredSchema<V>> : T[K]
}>

// export type PartialSchema<T extends Schema> = Infer<{
//     [K in keyof T]?: T[K] extends ObjectParser<infer V> ? ObjectParser<PartialSchema<V>> : T[K]
// }>

// export type RequiredSchema<T extends Schema> = Infer<{
//     [K in keyof T]-?: T[K] extends ObjectParser<infer V> ? ObjectParser<RequiredSchema<V>> : T[K]
// }>

export type OmitSchema<T extends Schema, U extends Mask<T>> = Infer<{
    [K in keyof T as K extends keyof U ? U[K] extends object ? K : never : K]: U[K] extends object ? T[K] extends ObjectParser<infer V> ? ObjectParser<OmitSchema<V, U[K]>> : T[K] : T[K]
}>

export type PickSchema<T extends Schema, U extends Mask<T>> = Infer<{
    [K in keyof U & keyof T]: 
        T[K] extends ObjectParser<infer V> ? 
            ObjectParser<PickSchema<V, U[K]>>
            : T[K]
}>
