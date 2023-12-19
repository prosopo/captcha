import { BaseParser, ParseOptions } from "./Parser.js"

export class StringParser extends BaseParser<string> {
    override parseShape(value: unknown, options?: ParseOptions): string {
        if (options?.coerce) {
            value = String(value)
        }
        if (typeof value !== 'string') {
            throw new Error(`Expected string but got ${typeof value}`)
        }
        return value
    }
}