import { BaseParser, ParseOptions, Parser } from "./Parser.js"

// TODO does the ctor type work here? test it out
export class InstanceParser<T> extends BaseParser<T> {
    constructor(private type: new (...args: any[]) => T) {
        super()
    }

    override parseShape(value: unknown, options?: ParseOptions): T {
        if (!(value instanceof this.type)) {
            throw new Error(`Expected instance of ${this.type.name} but got ${typeof value}`)
        }
        return value
    }

    override validate(value: T): void {
        super.validate(value)
        if (!(value instanceof this.type)) {
            throw new Error(`Expected instance of ${this.type.name} but got ${typeof value}`)
        }
    }
}

export const pInstance = <T>(type: new (...args: any[]) => T): Parser<T> => new InstanceParser(type)