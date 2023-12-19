import { Parseable } from "./Parseable.js"
import { BaseParser, ParseOptions } from "./Parser.js"

export class PickParser<T extends {}, U extends keyof T> extends BaseParser<Pick<T, U>> {
    constructor(private schema: Parseable<T>) {
        super()
    }

    override parseShape(value: unknown, options?: ParseOptions): Pick<T, U> {
        // TODO allow optional keys to do picked parsing
        throw new Error("Method not implemented.")
    }

    override validate(value: Pick<T, U>): void {
        super.validate(value)
        // TODO allow optional keys to do picked validation
        throw new Error("Method not implemented.")
    }
}
