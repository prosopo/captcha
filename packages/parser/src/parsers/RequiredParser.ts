import { FieldOptions, FieldParser, SetFieldOptions } from "./Parser.js"

export class RequiredParser<T, F extends FieldOptions> extends FieldParser<T, SetFieldOptions<F, {
    optional: false
}>> {
    constructor(private parser: FieldParser<T, F>) {
        super({
            ...parser.options,
            optional: false
        })
    }

    parse(value: unknown): T {
        if (value === undefined) {
            throw new Error(`Expected a value but got undefined`)
        }
        return this.parser.parse(value)
    }
}

export const pRequired = <T, F extends FieldOptions>(parser: FieldParser<T, F>) => new RequiredParser(parser)
export const req = pRequired