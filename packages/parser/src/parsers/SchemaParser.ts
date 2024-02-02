import { OptionalParser } from "./OptionalParser.js"
import { Parser, BaseParser, Output } from "./Parser.js"
import { ReadWriteParser } from "./ReadWriteParser.js"
import { ReadonlyParser } from "./ReadonlyParser.js"
import { RequiredParser } from "./RequiredParser.js"
import { Resolve } from "./utils.js"

export type Schema = {
    [key: string]: Parser<any> | Schema
}

// if a parser is required, then its output is not optional
// if a parser is optional, then its output is optional
// note that a parser could be several nested required/optionals chained together, so we need to check whether we hit a required or optional parser first. The first parser determines the optionality of the output.
// the optionality may be deep in the nesting of parsers, so we have to check if ...
export type isOptional<T> = T extends RequiredParser<any> ? false : T extends OptionalParser<any> ? true : false
export type isRequired<T> = T extends OptionalParser<any> ? false : T extends RequiredParser<any> ? true : false

// same as optional/required with readonly/readwrite
export type isReadonly<T> = T extends ReadWriteParser<any> ? false : T extends ReadonlyParser<any> ? true : false
export type isReadwrite<T> = T extends ReadonlyParser<any> ? false : T extends ReadWriteParser<any> ? true : false

// Unwrap a schema into its output
export type Shape<T extends Schema> = Resolve<{
    // for each key in T which is not mapped to an OptionalParser, map it to its output type (if it's a parser) or to its shape (if it's a schema) (by recursing this type)
    [K in keyof T as T[K] extends OptionalParser<any> ? never : T[K] extends ReadonlyParser<any> ? never : K]: T[K] extends Parser<infer U> ? U : T[K] extends Schema ? Shape<T[K]> : never
} & {
    // for each key in T which is mapped to an OptionalParser, map it to its output type. Mark the field as optional, also.
    [K in keyof T as T[K] extends OptionalParser<infer U> ? K : never]?: T[K] extends OptionalParser<infer U> ? U : never
} & {
    // for each key in T which is mapped to a ReadonlyParser, map it to its output type. Mark the field as readonly, also.
    readonly [K in keyof T as T[K] extends ReadonlyParser<infer U> ? K : never]: T[K] extends ReadonlyParser<infer U> ? U : never
}>

// Wrap an object into a schema, i.e. make every field a parser
export type ToSchema<T> = {
    [K in keyof T]: Parser<T[K]>
}

export interface SchemaParser<T extends Schema> extends Parser<Shape<T>> {
    readonly schema: T
    pick<U extends Mask<T>>(mask: U): SchemaParser<PickSchema<T, U>>
    omit<U extends Mask<T>>(mask: U): SchemaParser<OmitSchema<T, U>>
    extend<U extends Schema>(schema: U): SchemaParser<ExtendSchema<T, U>>
    partial<U extends Mask<T>>(mask: U): SchemaParser<PartialSchema<T, U>>
    readonly<U extends Mask<T>>(mask: U): SchemaParser<ReadonlySchema<T, U>>
}

export abstract class BaseSchemaParser<T extends Schema> extends BaseParser<Shape<T>> implements SchemaParser<T> {
    constructor(readonly schema: T) {
        super()
    }

    abstract pick<U extends Mask<T>>(mask: U): SchemaParser<PickSchema<T, U>>

    abstract omit<U extends Mask<T>>(mask: U): SchemaParser<OmitSchema<T, U>>

    abstract extend<U extends Schema>(schema: U): SchemaParser<ExtendSchema<T, U>>

    abstract partial<U extends Mask<T>>(mask: U): SchemaParser<PartialSchema<T, U>>

    abstract readonly<U extends Mask<T>>(mask: U): SchemaParser<ReadonlySchema<T, U>>
}

export const cloneSchema = <T extends Schema>(schema: T): T => {
    const result = {...schema}
    for (const key of Object.keys(schema)) {
        (result as any)[key] = (schema as any)[key].clone()
    }
    return result
}

export type Mask<T> = {
    [K in keyof T]?: any
}

export type PickSchema<T extends Schema, U extends Mask<T>> = Resolve<{
    [K in keyof U & keyof T]: T[K] extends SchemaParser<infer V> ? SchemaParser<PickSchema<V, U[K]>> : T[K]
}>

export const pickSchema = <T extends Schema, U extends Mask<T>>(schema: T, mask: U): PickSchema<T, U> => {
    throw new Error("Method not implemented.")
}

export type OmitSchema<T extends Schema, U extends Mask<T>> = Resolve<{
    [K in keyof T as K extends keyof U ? U[K] extends object ? K : never : K]: T[K] extends SchemaParser<infer V> ? SchemaParser<OmitSchema<V, U[K]>> : T[K]
}>

export const omitSchema = <T extends Schema, U extends Mask<T>>(schema: T, mask: U): OmitSchema<T, U> => {
    throw new Error("Method not implemented.")
}

export type ExtendSchema<T extends Schema, U extends Schema> = Resolve<{
    // U takes precedence over T given same key
    [K in keyof T | keyof U]: K extends keyof U ? U[K] : K extends keyof T ? T[K] : never
}>

export type PartialSchema<T extends Schema, U extends Mask<T>> = Resolve<{
    [K in keyof T]: K extends keyof U ? T[K] extends SchemaParser<infer V> ? SchemaParser<PartialSchema<V, U[K]>> : OptionalParser<Output<T[K]>> : T[K]
}>

export type ReadonlySchema<T extends Schema, U extends Mask<T>> = Resolve<{
    // wrap parsers in ReadonlyParser according to mask
    [K in keyof T & keyof U]: T[K] extends SchemaParser<infer V> ? SchemaParser<ReadonlySchema<V, U[K]>> : ReadonlyParser<Output<T[K]>>
} & {
    // passthrough parsers not in mask
    [K in keyof T as K extends keyof U ? never : K]: T[K] extends SchemaParser<infer V> ? SchemaParser<ReadonlySchema<V, U[K]>> : T[K]
}>