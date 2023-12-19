import { Parseable } from "./Parseable.js"
import { BaseParser, ParseOptions, Parser } from "./Parser.js"

export class PickParser<T extends {}, U extends keyof T> extends BaseParser<Pick<T, U>> {
    constructor(private schema: Parseable<T>) {
        super()
    }

    override _parse(value: unknown, options?: ParseOptions): Pick<T, U> {
        // TODO allow optional keys to do picked parsing
        throw new Error("Method not implemented.")
    }

    override validate(value: Pick<T, U>): void {
        super.validate(value)
        // TODO allow optional keys to do picked validation
        throw new Error("Method not implemented.")
    }
}

export const pPick = <T extends {}, U extends keyof T>(schema: Parseable<T>): Parser<Pick<T, U>> => new PickParser(schema)