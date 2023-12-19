import { BaseParser, ParseOptions, Parser } from "./Parser.js"


export class NullableParser<T> extends BaseParser<T | null> {
    constructor(private parser: Parser<T>) {
        super()
    }

    override parseShape(value: unknown, options?: ParseOptions): T | null {
        if (value === null) {
            return null
        }
        return this.parser.parse(value, options)
    }

    override validate(value: T | null): void {
        // run validators in this object as usual
        super.validate(value)
        if (value === null) {
            // value missing, so no need to validate it further
            return
        }
        // value present, so validate further
        this.parser.validate(value)
    }
}
