import { BaseParser, Parser } from "./Parser.js"

class BooleanParser extends BaseParser<boolean> {
    override _parse(value: unknown): boolean {
        if (typeof value !== 'boolean') {
            throw new Error(`Expected boolean but got ${typeof value}: ${value}`)
        }
        return value
    }
}

export const pBoolean = () => new BooleanParser()