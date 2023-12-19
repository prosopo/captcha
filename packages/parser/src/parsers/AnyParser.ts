import { BaseParser, ParseOptions, Parser } from "./Parser.js";

class AnyParser extends BaseParser<any> {
    override _parse(value: unknown, options?: ParseOptions): any {
        return value
    }
}

export const pAny = (): Parser<any> => new AnyParser()