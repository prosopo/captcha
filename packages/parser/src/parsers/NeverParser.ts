import { BaseParser, ParseOptions, Parser } from "./Parser.js";

export class NeverParser extends BaseParser<never> {
    override _parse(value: unknown, options?: ParseOptions): never {
        throw new Error(`Expected never but got ${typeof value}`)
    }
}

export const pNever = (): Parser<never> => new NeverParser()