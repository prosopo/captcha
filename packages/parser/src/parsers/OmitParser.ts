import { Parseable } from "./Parseable.js"
import { BaseParser, ParseOptions, Parser } from "./Parser.js"

export class OmitParser<T extends {}, U extends keyof T> extends BaseParser<Omit<T, U>> {
    constructor(private schema: Parseable<T>) {
        super()
    }

    override parseShape(value: unknown, options?: ParseOptions): Omit<T, U> {
        // TODO allow optional keys to do omitted parsing
        throw new Error("Method not implemented.")
    }

    override validate(value: Omit<T, U>): void {
        super.validate(value)
        // TODO allow optional keys to do omitted validation
        throw new Error("Method not implemented.")
    }
}

export const pOmit = <T extends {}, U extends keyof T>(schema: Parseable<T>): Parser<Omit<T, U>> => new OmitParser(schema)