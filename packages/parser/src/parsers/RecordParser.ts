import { BaseParser, ParseOptions, Parser } from "./Parser.js"

class RecordParser<T extends string | number | symbol, U> extends BaseParser<{
    [key in T]: U
}> {
    constructor(private parser: Parser<U>) {
        super()
    }

    override _parse(value: unknown, options?: ParseOptions): { [key in T]: U } {
        // TODO could be undefined?
        const result = {} as { [key in T]: U }
        for (const key in value as any) {
            result[key as T] = this.parser.parse((value as any)[key], options)
        }
        return result
    }

    override validate(value: { [key in T]: U }): void {
        super.validate(value)
        for (const key in value) {
            this.parser.validate(value[key])
        }
    }
}

export const pRecord = <T extends string | number | symbol, U>(parser: Parser<U>): Parser<{ [key in T]: U }> => new RecordParser(parser)