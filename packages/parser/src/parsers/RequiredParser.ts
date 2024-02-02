import { BaseParser, Parser } from "./Parser.js";

export class RequiredParser<T> extends BaseParser<Exclude<T, undefined>> {
    constructor(private parser: Parser<T>) {
        super()
    }

    parse(value: unknown): Exclude<T, undefined> {
        throw new Error("Method not implemented.")
    }

    override clone(): Parser<Exclude<T, undefined>> {
        throw new Error("Method not implemented.")
    }
}

export const pRequired = <T>(parser: Parser<T>) => new RequiredParser(parser)