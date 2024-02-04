import { FieldOptions, FieldParser, SetFieldOptions } from "./Parser.js"

export class ReadWriteParser<T, F extends FieldOptions> extends FieldParser<T, SetFieldOptions<F, {
    readonly: false
}>> {
    constructor(private parser: FieldParser<T, F>) {
        super({
            ...parser.options,
            readonly: false
        })
    }

    parse(value: unknown): T {
        return this.parser.parse(value)
    }
}

export const pReadWrite = <T, F extends FieldOptions>(parser: FieldParser<T, F>) => new ReadWriteParser(parser)
export const rw = pReadWrite