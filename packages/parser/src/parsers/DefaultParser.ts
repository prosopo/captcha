import { InstanceParser } from "./InstanceParser.js"
import { Parser } from "./Parser.js"
import { Ctor } from "./utils.js"

export class DefaultParser<T> extends Parser<T> {
    constructor(private _parser: Parser<T>, public defaultFn: () => T) {
        super()
        this._parser = this._parser.clone()
    }

    get parser() {
        return this._parser.clone()
    }

    public override shape(value: unknown): T {
        // call fn to get default value if value is missing
        if (value === undefined) {
            return this.defaultFn()
        }
        return this._parser.shape(value)
    }

    public override clone() {
        return new DefaultParser<T>(this.parser, this.defaultFn)
    }

    public override get name(): string {
        return `${this.parser.name} = ${this.defaultFn()}`
    }
}

export const pDefault = <T>(parser: Parser<T>, defaultFn: () => T) => new DefaultParser<T>(parser, defaultFn)
export const def = pDefault
export const defaultTo = pDefault
export const defaulted = pDefault