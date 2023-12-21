// import { MergeParser } from "./MergeParser.js"
import { BaseParser, Parser, Parseable } from "./Parser.js"

type Entries<T> = {
    [K in keyof T]: [K, T[K]]
}[keyof T][]

class ObjectParser<T extends {}> extends BaseParser<T> {
    constructor(private schema: Parseable<T>) {
        super()
    }

    _parse(value: unknown): T {
        // check runtime type
        if (typeof value !== 'object') {
            throw new Error(`Expected object but got ${typeof value}`)
        }
        // null is considered an object type, but isn't an object so throw
        if (value === null) {
            throw new Error(`Expected object but got null`)
        }
        // check for additional keys if strict mode is enabled
        // if (!options?.noStrict) {
        //     if (Object.keys(value).length > Object.keys(this.schema).length) {
        //         // either throw an error or remove the extra keys
        //         if (!options?.noStripExtraKeys) {
        //             throw new Error(
        //                 `Unexpected additional keys found in object: ${Object.keys(value)
        //                     .filter((key) => !(key in this.schema))
        //                     .join(', ')}`
        //             )
        //         } else {
        //             // find the extra keys by comparing against the schema
        //             const actualKeys = Object.keys(value)
        //             const expectedKeys = new Set(Object.keys(this.schema))
        //             const extraKeys = actualKeys.filter((key) => !expectedKeys.has(key))
        //             // remove the extra keys
        //             for (const key of extraKeys) {
        //                 delete (value as any)[key]
        //             }
        //         }
        //     }
        // }
        // // check the expected keys are present
        // const entries = Object.entries(this.schema) as Entries<Parseable<T>>
        // for (const [key, subSchema] of entries) {
        //     if (!(key in value)) {
        //         throw new Error(`Expected object to have key ${String(key)}`)
        //     }
        //     // parse the value for the key
        //     subSchema.parse((value as any)[key] as unknown)
        // }
        return value as T
    }

    merge<U>(parser: Parser<U>): Parser<T & U> {
        return new MergeParser(this, parser)
    }

    extend<U extends {}>(schema: Parseable<U>): Parser<T & U> {
        return this.merge(new ObjectParser(schema))
    }
}

export const pObject = <T extends {}>(schema: Parseable<T>): Parser<T> => new ObjectParser(schema)