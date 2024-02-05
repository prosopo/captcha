import { Cloneable, Resolve } from "./utils.js"

// a parser parses an unknown value into a known value of type T, throwing an error if the value is not of type T
export abstract class FieldParser<T, F extends FieldOptions> extends Cloneable<FieldParser<T, F>> {
    constructor(readonly options: F) {
        super()
    }

    public abstract parse(value: unknown): T

    public abstract override clone(): FieldParser<T, F>
}

// a value parser is a simple parser which is not concerned about the attributes of a field because it deals with primitive data types, e.g. number / string, etc.
export abstract class ValueParser<T> extends FieldParser<T, { optional: false, readonly: false }> {
    constructor() {
        super({ optional: false, readonly: false })
    }
}

export abstract class ChainedFieldParser<T, F extends FieldOptions, G extends Partial<FieldOptions>> extends FieldParser<T, SetFieldOptions<F, G>> {
    constructor(private _parser: FieldParser<T, F>, options: SetFieldOptions<F, G>) {
        super(options)
        // clone the parser to keep an internal copy
        this._parser = _parser.clone()
    }

    public get parser() {
        // clone for any external use
        return this._parser.clone()
    }
}

export type FieldOptions = {
    optional: boolean // mark the field as optional in an object
    readonly: boolean // mark the field as readonly in an object
}

export type SetFieldOptions<T extends FieldOptions, U extends Partial<FieldOptions>> = {
    optional: U["optional"] extends true ? true : T["optional"],
    readonly: U["readonly"] extends true ? true : T["readonly"]
}

export type IsOptional<T> = T extends FieldParser<any, infer F> ? F extends { optional: true } ? true : false : never
export type IsRequired<T> = T extends FieldParser<any, infer F> ? F extends { optional: false } ? true : false : never
export type IsReadonly<T> = T extends FieldParser<any, infer F> ? F extends { readonly: true } ? true : false : never
export type IsReadWrite<T> = T extends FieldParser<any, infer F> ? F extends { readonly: false } ? true : false : never


type a1 = SetFieldOptions<{ optional: false, readonly: false }, { optional: true }>
type a2 = SetFieldOptions<{ optional: false, readonly: false }, { readonly: true }>
type a3 = SetFieldOptions<{ optional: true, readonly: true }, { optional: false }>
type a4 = SetFieldOptions<{ optional: true, readonly: true }, { readonly: false }>
type a5 = SetFieldOptions<{ optional: true, readonly: true }, { optional: false, readonly: false }>
type a6 = SetFieldOptions<{ optional: true, readonly: true }, {}>

