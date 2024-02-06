import { OptionalParser } from "./OptionalParser.js"
import { ReadonlyParser } from "./ReadonlyParser.js"
import { Cloneable, Resolve } from "./utils.js"

// simple parser which takes an unknown value and returns a known value of type T, throwing an error if the value is not of type T
export abstract class Parser<T> extends Cloneable<Parser<T>> {
    public abstract parse(value: unknown): T
}

// nested parser wraps another parser. For types + parsing to work, we need access to the wrapped parser, exposed by this interface
export interface NestedParser<T extends Parser<any>> {
    readonly parser: T
}

// mark a parser as optional or readonly. This is used to determine if a parser is optional or readonly, and to set the optional or readonly flag on the field of an object when the parser is part of an object parser
// NOTE: make sure to implement the NestedParser interface for nested parsers to operate properly with optional and readonly props
export interface OptionalPropMarker<P> {
    readonly optional: P
}
export interface ReadonlyPropMarker<P> {
    readonly readonly: P
}

export interface OptionalProp<P, T extends Parser<any>> extends OptionalPropMarker<P>, NestedParser<T> { }
export interface ReadonlyProp<P, T extends Parser<any>> extends ReadonlyPropMarker<P>, NestedParser<T> { }

export type Shape<T> = T extends Parser<infer U> ? U : never

// optional if OptionalProp<P> is present. P determines if the prop is optional or not. If OptionalProp<P> is not present, the prop is not optional. However, if it is a nested parser then we need to look at the inner parser, as that may be optional itself, so recurse.
export type IsOptional<T> = T extends OptionalPropMarker<infer P> ? P : T extends NestedParser<infer U> ? IsOptional<U> : false
// same for readonly
export type IsReadonly<T> = T extends ReadonlyPropMarker<infer P> ? P : T extends NestedParser<infer U> ? IsReadonly<U> : false