import { BaseParser, ParseOptions, Parser } from "./Parser.js"

export class DateParser extends BaseParser<Date> {
    override parseShape(value: unknown, options?: ParseOptions): Date {
        if (options?.coerce && (typeof value === 'string' || typeof value === 'number' || value instanceof Date)) {
            value = new Date(value)
        }
        if (!(value instanceof Date)) {
            throw new Error(`Expected date but got ${typeof value}`)
        }
        return value
    }
}

export const pDate = (): Parser<Date> => new DateParser()