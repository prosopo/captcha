import { BaseParser, Parser } from "./Parser.js";

export class ReadWriteParser<T> extends BaseParser<T> {
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

export const pReadWrite = <T>(parser: Parser<T>) => new ReadWriteParser(parser)