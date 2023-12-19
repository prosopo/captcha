import { BaseParser, ParseOptions } from "./Parser.js";

export class UnknownParser extends BaseParser<unknown> {
    override parseShape(value: unknown, options?: ParseOptions): unknown {
        return value
    }
}
