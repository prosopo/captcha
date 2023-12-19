import { BaseParser, ParseOptions, Parser } from "./Parser.js"

export class UnionParser2<T, U> extends BaseParser<T | U> {
    constructor(
        private first: Parser<T>,
        private second: Parser<U>
    ) {
        super()
    }

    parseShape(value: unknown, options?: ParseOptions): T | U {
        // one of the parsers should work
        for (const parser of [this.first, this.second]) {
            try {
                return parser.parse(value)
            } catch {}
        }
        throw new Error(`Expected value to match one of the union parsers but none matched`)
    }

    override validate(value: T | U): void {
        super.validate(value)
        // validate against each parser
        // TODO fix false positiives, see other union parser
        for (const parser of [this.first, this.second]) {
            try {
                parser.validate(value as U & T)
            } catch {}
        }
        throw new Error(`Expected value to match one of the union parsers but none matched`)
    }
}