import { BaseParser } from "./Parser.js";


export class AnyParser extends BaseParser<any> {
    parse(value: unknown): any {
        return value
    }
}

export const pAny = () => new AnyParser()