import { Cloneable } from "./utils.js"

export type ValidateOptions = {
    /**
     * If true, the value will be validated in place, and the original value will be modified. If false, the original value will be left unchanged and a new value will be created.
     * 
     * E.g. given an array of [" a", "b ", " c "], with a trim validator, the array will be transformed to ["a", "b", "c"] if in place is true, and a new array ["a", "b", "c"] will be created if in place is false (meaning the original array of [" a", "b ", " c "] will be left unchanged).
     */
    disableInPlace?: boolean
}

/**
 * A validator takes an unknown value and shapes it into a known type, or throws an error if it cannot. The value is then refined, or an error is thrown if it cannot be refined.
 */
export abstract class Validator<I, O> implements Cloneable<Validator<I, O>> {
    /**
     * Validate a value, converting it from one type to another. By default, this is converting an unknown value to a known type, but it can also be used to convert between known types.
     * @param value the value to validate
     * @returns a validated value
     */
    public abstract validate(value: I, options?: ValidateOptions): O

    /**
     * Clone this validator. Make sure to clone any state held by the validator to avoid sharing state between instances.
     * @returns a new validator that is the same as this one
     */
    public abstract clone(): Validator<I, O>

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
export interface NestedValidator<T extends Validator<unknown, unknown>> {
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

export interface OptionalProp<P, T extends Validator<unknown, unknown>> extends OptionalPropMarker<P>, NestedValidator<T> { }
export interface ReadonlyProp<P, T extends Validator<unknown, unknown>> extends ReadonlyPropMarker<P>, NestedValidator<T> { }

export type InferInput<T> = T extends Validator<infer I, unknown> ? I : never
export type InferArrayInput<T> = T extends [] ? [] : T extends [infer U, ...infer R] ? [InferInput<U>, ...InferArrayInput<R>] : never
export type InferOutput<T> = T extends Validator<unknown, infer O> ? O : never
export type InferArrayOutput<T> = T extends [] ? [] : T extends [infer U, ...infer R] ? [InferOutput<U>, ...InferArrayOutput<R>] : never
export type Shape<T> = InferOutput<T>

// optional if OptionalProp<P> is present. P determines if the prop is optional or not. If OptionalProp<P> is not present, the prop is not optional. However, if it is a nested parser then we need to look at the inner parser, as that may be optional itself, so recurse.
export type IsOptional<T> = T extends OptionalPropMarker<infer P> ? P : T extends NestedValidator<infer U> ? IsOptional<U> : false
// same for readonly
export type IsReadonly<T> = T extends ReadonlyPropMarker<infer P> ? P : T extends NestedValidator<infer U> ? IsReadonly<U> : false

type a = [Validator<string, boolean>, Validator<number, bigint>]
type b = InferArrayInput<a>
type c = InferArrayOutput<a>