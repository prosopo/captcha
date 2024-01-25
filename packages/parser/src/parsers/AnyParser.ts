import { BaseParser, Parser } from "./Parser.js";


export class AnyParser extends BaseParser<any> {
    parse(value: unknown): any {
        return value
    }
    override clone(): Parser<any> {
        return pAny()
    }
}

export const pAny = () => new AnyParser()