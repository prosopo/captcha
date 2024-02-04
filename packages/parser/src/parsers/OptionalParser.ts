import { FieldOptions, FieldParser, SetFieldOptions } from "./Parser.js"


export class OptionalParser<T, F extends FieldOptions> extends FieldParser<T | undefined, SetFieldOptions<F, {
    optional: true
}>> {
    constructor(private parser: FieldParser<T, F>) {
        super({
            ...parser.options,
            optional: true
        })
    }

    parse(value: unknown): T | undefined {
        if (value === undefined) {
            return undefined
        }
        return this.parser.parse(value)
    }
}

export const pOptional = <T, F extends FieldOptions>(parser: FieldParser<T, F>) => new OptionalParser(parser)
export const opt = pOptional