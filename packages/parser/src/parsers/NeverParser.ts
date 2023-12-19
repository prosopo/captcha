import { BaseParser, ParseOptions } from "./Parser.js";

export class NeverParser extends BaseParser<never> {
    override parseShape(value: unknown, options?: ParseOptions): never {
        throw new Error(`Expected never but got ${typeof value}`)
    }
}
