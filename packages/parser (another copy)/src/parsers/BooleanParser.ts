import { BaseParser } from "./Parser.js"

export class BooleanParser extends BaseParser<boolean> {
    parse(value: unknown): boolean {
        if (typeof value !== 'boolean') {
            throw new Error(`Expected boolean but got ${JSON.stringify(value)} of type ${typeof value}`)
        }
        return value
    }
}

export const pBoolean = () => new BooleanParser()