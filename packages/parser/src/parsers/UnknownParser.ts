import { BaseParser, ParseOptions, Parser } from "./Parser.js";

export class UnknownParser extends BaseParser<unknown> {
    override parseShape(value: unknown, options?: ParseOptions): unknown {
        return value
    }
}

export const pUnknown = (): Parser<unknown> => new UnknownParser()