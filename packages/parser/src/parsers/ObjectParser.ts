// import { MergeParser } from "./MergeParser.js"
import { BaseParser, Parser, Parseable } from "./Parser.js"

type Entries<T> = {
    [K in keyof T]: [K, T[K]]
}[keyof T][]

export interface ObjectParserOptions {
    // what to do with extra keys on an object? e.g. if the schema is { a: number } and we're given { a: 1, b: 2 }, what should we do about the 'b' field?
    extraProperties?: 'delete' | 'error' | 'passthrough' // undefined == passthrough
}

class ObjectParser<T extends {}> extends BaseParser<T> {
    constructor(private schema: Parseable<T>, private options: ObjectParserOptions = {}) {
        super()
    }

    _parse(value: unknown): T {
        // check runtime type
        // null is considered an object type, but isn't an object so throw
        if (typeof value !== 'object' || value === null) {
            throw new Error(`Expected object but got ${typeof value}`)
        }

        // iterate over schema properties and parse each field
        const entries = Object.entries(this.schema) as Entries<Parseable<T>>
        const keys = Object.keys(value);
        const keySet = new Set<string | number | symbol>(keys)
        const output = value as any
        for (const [key, subSchema] of entries) {
            // parse the value for the key
            output[key] = subSchema.parse(output[key])
            // remove the key from the set of keys, it has been parsed so forget about it
            keySet.delete(key)
        }
        // any keys remaining in the key set are not known according to the schema. Handle these unknown properties
        for (const key of keySet) {
            if (this.options.extraProperties === 'delete') {
                delete (output as any)[key]
            } else if (this.options.extraProperties === 'error') {
                throw new Error(`unexpected property ${String(key)} found on ${value}`)
            } else if (this.options.extraProperties === 'passthrough' || this.options.extraProperties === undefined) {
                // do nothing, let the value passthrough
            } else {
                throw new Error(`unknown extraProperty handler: ${this.options.extraProperties}`)
            }
        }

        return output as T
    }

    // merge<U>(parser: Parser<U>): Parser<T & U> {
    //     return new MergeParser(this, parser)
    // }

    // extend<U extends {}>(schema: Parseable<U>): Parser<T & U> {
    //     return this.merge(new ObjectParser(schema))
    // }
}

export const pObject = <T extends {}>(schema: Parseable<T>): ObjectParser<T> => new ObjectParser(schema)