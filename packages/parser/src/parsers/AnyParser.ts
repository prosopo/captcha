import { BaseParser, ParseOptions } from "./Parser.js";

export class AnyParser extends BaseParser<any> {
    override parseShape(value: unknown, options?: ParseOptions): any {
        return value
    }
}