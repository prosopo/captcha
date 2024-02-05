import { Cloneable, Resolve } from "./utils.js"

// simple parser which takes an unknown value and returns a known value of type T, throwing an error if the value is not of type T
export abstract class Parser<T> extends Cloneable<Parser<T>> {
    public abstract parse(value: unknown): T
}

export type Shape<T extends Parser<any>> = T extends Parser<infer U> ? U : never