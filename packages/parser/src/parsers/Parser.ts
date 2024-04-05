import { OptionalParser, opt } from "./OptionalParser.js"
import { ReadonlyParser } from "./ReadonlyParser.js"
import { Refiner } from "./Refiner.js"
import { Result, failible } from "./result.js"
import { Cloneable, Resolve, removeSuffix, toCamelCase } from "./utils.js"

/**
 * A Shaper takes an unknown value and shapes it into a known type, or throws an error if it cannot.
 */
export abstract class Shaper<T> extends Refiner<T> {

    /**
     * Convert an unknown value into a known type, or throw an error if it cannot. E.g. a string parser would test whether the value is a string, and throw an error if it is not.
     * @param value an unknown value to shape
     */
    public abstract shape(value: unknown): T

    /**
     * Validating an unknown value is the process of shaping it into a known type, then refining it. If the value cannot be shaped, an error is thrown. If the value cannot be refined, an error is thrown. E.g. an email parser would first check if the value is a string (shape), then trim whitespace (transform) and check the string conforms to email address format (validation).
     * @param value the unknown value to validate
     * @returns a validated value
     */
    public validate(value: unknown): T {
        const shaped = this.shape(value)
        const refined = this.refine(shaped)
        return refined
    }

}

// nested parser wraps another parser. For types + parsing to work, we need access to the wrapped parser, exposed by this interface
export interface NestedShaper<T extends Shaper<any>> {
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

export interface OptionalProp<P, T extends Shaper<any>> extends OptionalPropMarker<P>, NestedShaper<T> { }
export interface ReadonlyProp<P, T extends Shaper<any>> extends ReadonlyPropMarker<P>, NestedShaper<T> { }

export type Shape<T> = T extends Shaper<infer U> ? U : never

// optional if OptionalProp<P> is present. P determines if the prop is optional or not. If OptionalProp<P> is not present, the prop is not optional. However, if it is a nested parser then we need to look at the inner parser, as that may be optional itself, so recurse.
export type IsOptional<T> = T extends OptionalPropMarker<infer P> ? P : T extends NestedShaper<infer U> ? IsOptional<U> : false
// same for readonly
export type IsReadonly<T> = T extends ReadonlyPropMarker<infer P> ? P : T extends NestedShaper<infer U> ? IsReadonly<U> : false