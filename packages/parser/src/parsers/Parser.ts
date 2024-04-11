import { OptionalParser, opt } from "./OptionalParser.js"
import { ReadonlyParser } from "./ReadonlyParser.js"
import { Refiner } from "./Refiner.js"
import { Result, failible } from "./result.js"
import { Cloneable, Resolve, removeSuffix, toCamelCase } from "./utils.js"

/**
 * A validator takes an unknown value and shapes it into a known type, or throws an error if it cannot. The value is then refined, or an error is thrown if it cannot be refined.
 */
export abstract class Validator<T, U = unknown> implements Cloneable<Validator<T, U>> {
    /**
     * Validate a value, converting it from one type to another. By default, this is converting an unknown value to a known type, but it can also be used to convert between known types.
     * @param value the value to validate
     * @returns a validated value
     */
    public abstract validate(value: U): T

    /**
     * Clone this validator. Make sure to clone any state held by the validator to avoid sharing state between instances.
     * @returns a new validator that is the same as this one
     */
    public abstract clone(): Validator<T, U>

    /**
     * Get the name of the type output by this validator. This is used for debugging and error messages.
     * 
     * E.g. for a string validator, the name would be "string".
     * E.g. for an email validator, the name would be "email".
     * 
     * @returns the name of the type output by this validator 
     */
    public abstract get name(): string
}

// nested parser wraps another parser. For types + parsing to work, we need access to the wrapped parser, exposed by this interface
export interface NestedValidator<T extends Validator<any>> {
    readonly parser: T
}

// mark a parser as optional or readonly. This is used to determine if a parser is optional or readonly, and to set the optional or readonly flag on the field of an object when the parser is part of an object parser
// NOTE: make sure to implement the NestedParser interface for nested parsers to operate properly with optional and readonly props
// NOTE: we use a symbol to declare the marker field to avoid collisions with other fields named "optional" or "readonly". The collision is unlikely, but would be silent and hard to debug if it happened, thus using a symbol to avoid it
export const optionalMarker: unique symbol = Symbol("optional")
export interface OptionalPropMarker<P> {
    readonly [optionalMarker]: P
}
export const readonlyMarker: unique symbol = Symbol("readonly")
export interface ReadonlyPropMarker<P> {
    readonly [readonlyMarker]: P
}

export interface OptionalProp<P, T extends Validator<any>> extends OptionalPropMarker<P>, NestedValidator<T> { }
export interface ReadonlyProp<P, T extends Validator<any>> extends ReadonlyPropMarker<P>, NestedValidator<T> { }

export type Shape<T> = T extends Validator<infer U> ? U : never

// optional if OptionalProp<P> is present. P determines if the prop is optional or not. If OptionalProp<P> is not present, the prop is not optional. However, if it is a nested parser then we need to look at the inner parser, as that may be optional itself, so recurse.
export type IsOptional<T> = T extends OptionalPropMarker<infer P> ? P : T extends NestedValidator<infer U> ? IsOptional<U> : false
// same for readonly
export type IsReadonly<T> = T extends ReadonlyPropMarker<infer P> ? P : T extends NestedValidator<infer U> ? IsReadonly<U> : false