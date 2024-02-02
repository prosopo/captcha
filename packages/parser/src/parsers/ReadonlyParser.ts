import { BaseParser, Parser } from "./Parser.js";

export class ReadonlyParser<T> extends BaseParser<T> {
    constructor(private parser: Parser<T>) {
        super()
    }

    parse(value: unknown): T {
        // TODO object.freeze
        throw new Error("Method not implemented.")
    }

    override clone(): Parser<T> {
        throw new Error("Method not implemented.")
    }
}

export const pReadonly = <T>(parser: Parser<T>) => new ReadonlyParser(parser)