import { get } from "@prosopo/util"
import { BaseParser, Parser } from "./Parser.js"
import { Infer, Schema, Shape } from "./utils.js"
import { pNumber } from "./NumberParser.js"
import { pString } from "./StringParser.js"

export class ObjectParser<T extends Schema> extends BaseParser<Infer<Shape<T>>> {

    constructor(readonly schema: T) {
        super()
    }

    parse(value: unknown): Infer<Shape<T>> {
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

    public pick<U extends {}>(mask: U): ObjectParser<PickSchema<T, U>> {
        return null!
    }
}

export const pObject = <T extends Schema>(schema: T) => new ObjectParser(schema)

const a = pObject({ a: pString(), b: pNumber(), c: pObject({ d: pString(), e: pNumber() }) })
type d = ReturnType<typeof a.parse>
const b = a.pick({ a: true, c: { d: true } })
type c = ReturnType<typeof b.parse>

export type PickSchema<T extends Schema, U extends {}> = Infer<{
    [K in keyof U & keyof T]: T[K] extends Parser<infer V> ? T[K] extends ObjectParser<infer W> ? U[K] extends {
        [K2 in keyof W]?: any
    } ? ObjectParser<Infer<PickSchema<W, U[K]>>> : Parser<V> : Parser<V> : never
}>