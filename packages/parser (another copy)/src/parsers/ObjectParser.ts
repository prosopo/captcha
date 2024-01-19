import { BaseParser, Parser } from "./Parser.js"



export type Schema = {
    [key: string]: Parser<any>
}

export type SchemaShape<T extends Schema> = {
    [K in keyof T]: T[K] extends Parser<infer U> ? U : never
}

export class ObjectParser<T extends Schema> extends BaseParser<SchemaShape<T>> {

    constructor(private schema: T) {
        super()
    }

    parse(value: unknown): SchemaShape<T> {
        // TODO
        return null!
    }

    // public extend<U extends Schema>(schema: U): ObjectParser<T & U> {
    //     return new ObjectParser({ ...this.schema, ...schema })
    // }
}

