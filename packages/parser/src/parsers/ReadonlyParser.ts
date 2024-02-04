import { FieldOptions, FieldParser, SetFieldOptions } from "./Parser.js"

export class ReadonlyParser<T, F extends FieldOptions> extends FieldParser<T, SetFieldOptions<F, {
    readonly: true
}>> {
    constructor(private parser: FieldParser<T, F>) {
        super({
            ...parser.options,
            readonly: true
        })
    }

    parse(value: unknown): T {
        return this.parser.parse(value)
    }
}

export const pReadonly = <T, F extends FieldOptions>(parser: FieldParser<T, F>) => new ReadonlyParser(parser)
export const ro = pReadonly