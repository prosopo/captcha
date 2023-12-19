import { BaseParser, ParseOptions, Parser } from "./Parser.js"

// Parses the shape of two parsers merged together via intersection
export class MergeParser<T, U> extends BaseParser<T & U> {
    constructor(private first: Parser<T>, private second: Parser<U>) {
        super()
    }

    override parseShape(value: unknown, options?: ParseOptions): T & U {
        // TODO allow fields from second to exist when parsing first and vice versa
        const first = this.first.parse(value, options)
        const second = this.second.parse(value, options)
        return { ...first, ...second }
    }

    override validate(value: T & U): void {
        super.validate(value)
        this.first.validate(value)
        this.second.validate(value)
    }
}

// TODO fix this, doesn't work properly!
// should this be called intersection??