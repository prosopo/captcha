import { BaseParser, Parser } from "./Parser.js"


export class OrParser<T, U> extends BaseParser<T | U> {
    constructor(private first: Parser<T>, private second: Parser<U>) {
        super()
    }

    parse(value: unknown): T | U {
        try {
            return this.first.parse(value)
        } catch (error1) {
            try {
                return this.second.parse(value)
            } catch (error2) {
                throw new Error(`Failed to union type for value: ${value}. First error: ${error1}. Second error: ${error2}`)
            }
        }
    }
}