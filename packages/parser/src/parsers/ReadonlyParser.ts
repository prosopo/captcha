import { ChainedFieldParser, FieldOptions, FieldParser, SetFieldOptions } from "./Parser.js"

export class ReadonlyParser<T, F extends FieldOptions> extends ChainedFieldParser<T, F, {
    readonly: true
}> {
    constructor(parser: FieldParser<T, F>) {
        super(parser, {
            ...parser.options,
            readonly: true
        })
    }

    public override parse(value: unknown): T {
        return this.parser.parse(value)
    }

    public override clone() {
        return new ReadonlyParser(this.parser)
    }
}

export const pReadonly = <T, F extends FieldOptions>(parser: FieldParser<T, F>) => new ReadonlyParser(parser)
export const ro = pReadonly