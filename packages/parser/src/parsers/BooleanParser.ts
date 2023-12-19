import { BaseParser, ParseOptions, Parser } from "./Parser.js"

class BooleanParser extends BaseParser<boolean> {
    override _parse(value: unknown, options?: ParseOptions): boolean {
        if (options?.coerce) {
            value = Boolean(value)
        }
        if (typeof value !== 'boolean') {
            throw new Error(`Expected boolean but got ${typeof value}`)
        }
        return value
    }
}

export const pBoolean = (): Parser<boolean> => new BooleanParser()