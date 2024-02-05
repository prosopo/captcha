import { ChainedFieldParser, FieldOptions, FieldParser, SetFieldOptions } from "./Parser.js"

export class RequiredParser<T, F extends FieldOptions> extends ChainedFieldParser<T, F, {
    optional: false
}> {

    constructor(parser: FieldParser<T, F>) {
        super(parser, {
            ...parser.options,
            optional: false
        })
    }

    public override parse(value: unknown): T {
        if (value === undefined) {
            throw new Error(`Expected a value but got undefined`)
        }
        return this.parser.parse(value)
    }

    public override clone() {
        return new RequiredParser(this.parser)
    }
}

export const pRequired = <T, F extends FieldOptions>(parser: FieldParser<T, F>) => new RequiredParser(parser)
export const req = pRequired