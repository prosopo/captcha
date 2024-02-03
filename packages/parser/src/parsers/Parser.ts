import { Resolve } from "./utils.js"

export interface Cloneable<T> {
    clone(): T
}

export type FieldOptions = {
    optional?: boolean // mark the field as optional in an object
    readonly?: boolean // mark the field as readonly in an object
}

export interface Parser<T, F extends FieldOptions = {}> extends Cloneable<Parser<T, F>> {
    parse(value: unknown): T
}

export abstract class BaseParser<T, F extends FieldOptions = {}> implements Parser<T, F> {
    abstract parse(value: unknown): T
    abstract clone(): Parser<T, F>
}

export type Output<T> = T extends Parser<infer U> ? U : never