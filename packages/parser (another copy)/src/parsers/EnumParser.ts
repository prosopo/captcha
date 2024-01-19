import { BaseParser } from "./Parser.js";

export class EnumParser<const T> extends BaseParser<T> {
    constructor(private readonly values: T[]) {
        super()
    }

    parse(value: unknown): T {
        if (!this.values.includes(value as T)) {
            throw new Error(`Expected one of ${this.values.join(', ')} but got ${value}`)
        }
        return value as T
    }
}