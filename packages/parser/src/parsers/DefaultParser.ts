import { InstanceParser } from "./InstanceParser.js"
import { Parser } from "./Parser.js"
import { Ctor } from "./utils.js"

export class DefaultParser<T> extends Parser<T> {
    constructor(public defaultFn: () => T) {
        super()
    }

    public override parse(value: unknown): T {
        // call fn to get default value if value is undefined
        if (value === undefined) {
            return this.defaultFn()
        }
        // else leave value as-is
        return value as T
    }

    public override clone() {
        return new DefaultParser<T>(this.defaultFn)
    }
}

export const pDefault = <T>(defaultFn: () => T) => new DefaultParser<T>(defaultFn)
export const def = pDefault
export const defaultTo = pDefault
export const defaulted = pDefault