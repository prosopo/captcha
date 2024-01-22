import { get } from "@prosopo/util"
import { BaseParser, Parser } from "./Parser.js"
import { Schema, Shape } from "./utils.js"

export class ObjectParser<T extends Schema> extends BaseParser<Shape<T>> {

    constructor(private schema: T) {
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
}

export const pObject = <T extends Schema>(schema: T) => new ObjectParser(schema)