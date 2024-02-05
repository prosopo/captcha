import { ChainedFieldParser, FieldOptions, FieldParser, SetFieldOptions } from "./Parser.js"

export class ReadWriteParser<T, F extends FieldOptions> extends ChainedFieldParser<T, F, {
    readonly: false
}> {
    constructor(parser: FieldParser<T, F>) {
        super(parser, {
            ...parser.options,
            readonly: false
        })
    }

    public override parse(value: unknown): T {
        return this.parser.parse(value)
    }

    public override clone() {
        return new ReadWriteParser(this.parser)
    }
}

export const pReadWrite = <T, F extends FieldOptions>(parser: FieldParser<T, F>) => new ReadWriteParser(parser)
export const rw = pReadWrite