import { BaseParser, ParseOptions, Parser } from "./Parser.js";

export class AnyParser extends BaseParser<any> {
    override parseShape(value: unknown, options?: ParseOptions): any {
        return value
    }
}

export const pAny = (): Parser<any> => new AnyParser()