import { ChainedFieldParser, FieldOptions, FieldParser, SetFieldOptions } from "./Parser.js"


export class OptionalParser<T, F extends FieldOptions> extends ChainedFieldParser<T | undefined, F, {
    optional: true
}> {
    constructor(parser: FieldParser<T, F>) {
        super(parser, {
            ...parser.options,
            optional: true
        })
    }

    public override parse(value: unknown): T | undefined {
        if (value === undefined) {
            return undefined
        }
        return this.parser.parse(value)
    }

    public override clone() {
        return new OptionalParser(this.parser)
    }
}

export const pOptional = <T, F extends FieldOptions>(parser: FieldParser<T, F>) => new OptionalParser(parser)
export const opt = pOptional