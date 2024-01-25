import { BaseParser, Parser } from "./Parser.js"

export class BooleanParser extends BaseParser<boolean> {
    parse(value: unknown): boolean {
        if (typeof value !== 'boolean') {
            throw new Error(`Expected boolean but got ${JSON.stringify(value)} of type ${JSON.stringify(typeof value)}`)
        }
        return value
    }

    override clone(): Parser<boolean> {
        return pBoolean()
    }
}

export const pBoolean = () => new BooleanParser()