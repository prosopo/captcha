import { BaseParser, ParseOptions, Parser } from "./Parser.js"

export class OptionalParser<T> extends BaseParser<T | undefined> {
    constructor(private parser: Parser<T>) {
        super()
    }

    override parseShape(value: unknown, options?: ParseOptions): T | undefined {
        if (value === undefined) {
            return undefined
        }
        return this.parser.parse(value, options)
    }

    override validate(value: T | undefined): void {
        // run validators in this object as usual
        super.validate(value)
        if (value === undefined) {
            // value missing, so no need to validate it further
            return
        }
        // value present, so validate further
        this.parser.validate(value)
    }
}

export const pOptional = <T>(parser: Parser<T>): Parser<T | undefined> => new OptionalParser(parser)