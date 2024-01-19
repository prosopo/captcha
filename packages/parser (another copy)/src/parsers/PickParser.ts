import { BaseParser, Parser } from "./Parser.js"



export type Schema = {
    [key: string]: Parser<any>
}

export type SchemaShape<T extends Schema> = {
    [K in keyof T]: T[K] extends Parser<infer U> ? U : never
}

export class PickParser<T extends Schema> extends BaseParser<SchemaShape<T>> {

    constructor(private schema: T) {
        super()
    }

    parse(value: unknown): SchemaShape<T> {
        // TODO
        return null!
    }

}

