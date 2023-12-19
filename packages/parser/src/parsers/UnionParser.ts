import { BaseParser, ParseOptions, Parser } from "./Parser.js"

export type ParserArrayToShape<T> = T extends ReadonlyArray<Parser<infer U>> ? U : never


export class UnionParser<T extends ReadonlyArray<Parser<unknown>>, U extends ParserArrayToShape<T>> extends BaseParser<U> {
    constructor(private parsers: T) {
        super()
    }

    override parseShape(value: unknown, options?: ParseOptions): U {
        for (const parser of this.parsers) {
            try {
                return parser.parse(value, options) as U // cast to U because we know it will be one of the parsers
            } catch {}
        }
        throw new Error(`Expected value to match one of the union parsers but none matched`)
    }

    override validate(value: U): void {
        super.validate(value)
        // delegate to full blown parsing, as we cannot be certain which parser is correct for the type.

        // loop through each parser
        for (const parser of this.parsers) {
            try {
                // e.g. given number | string, we cannot be certain whether the value is a number or a string, so we must try both
                // it may be that the validator for the string passes when the value is a number and the number parser's validator fails, so we cannot rely on the validators due to false positivies.
                // therefore we must parse the value and see if it works. This will check the shape and validate the value.
                parser.parse(value)
                return // if the parser validates, then we're done
            } catch {}
        }
    }
}

export const pUnion = <T extends ReadonlyArray<Parser<unknown>>>(...parsers: T): Parser<ParserArrayToShape<T>> => new UnionParser(parsers) as Parser<ParserArrayToShape<T>>

// TODO fix generics