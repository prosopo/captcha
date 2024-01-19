import { BaseParser } from "./Parser.js";


export class UnknownParser extends BaseParser<unknown> {
    parse(value: unknown): unknown {
        return value
    }
}