import { Cloneable, Resolve } from "./utils.js"

// a parser parses an unknown value into a known value of type T, throwing an error if the value is not of type T
export abstract class FieldParser<T, F extends FieldOptions> extends Cloneable<FieldParser<T, F>> {
    constructor(readonly options: F) {
        super()
    }

    public abstract parse(value: unknown): T
}


export abstract class ValueParser<T> extends FieldParser<T, { optional: false, readonly: false }> {
    constructor() {
        super({ optional: false, readonly: false })
    }
}

export type FieldOptions = {
    optional: boolean // mark the field as optional in an object
    readonly: boolean // mark the field as readonly in an object
}

export type SetFieldOptions<T extends FieldOptions, U extends Partial<FieldOptions>> = Resolve<{
    optional: undefined extends U["optional"] ? T["optional"] : U["optional"]
    readonly: undefined extends U["readonly"] ? T["readonly"] : U["readonly"]
}>

export type IsOptional<T> = T extends FieldParser<any, infer F> ? F extends { optional: true } ? true : false : never
export type IsRequired<T> = T extends FieldParser<any, infer F> ? F extends { optional: false } ? true : false : never
export type IsReadonly<T> = T extends FieldParser<any, infer F> ? F extends { readonly: true } ? true : false : never
export type IsReadWrite<T> = T extends FieldParser<any, infer F> ? F extends { readonly: false } ? true : false : never
