import { OptionalParser, opt } from "./OptionalParser.js"
import { ReadonlyParser } from "./ReadonlyParser.js"
import { Result, failible } from "./result.js"
import { Cloneable, Resolve, removeSuffix, toCamelCase } from "./utils.js"

/**
 * A Shaper takes an unknown value and shapes it into a known type, or throws an error if it cannot.
 */
export abstract class Shaper<T> extends Cloneable<Shaper<T>> {
    public abstract shape(value: unknown): T
    
    public isShape(value: unknown): {
        ok: true,
        result: T,
    } | {
        ok: false,
        result: Error,
    } {
        try {
            return {
                ok: true,
                result: this.shape(value),
            }
        } catch (e) {
            return {
                ok: false,
                result: e instanceof Error ? e : new Error(String(e)),
            }
        }
    }

    public get name(): string {
        const name = this.constructor.name
        const typeName = removeSuffix(name, "Parser")
        const typeNameCamel = toCamelCase(typeName)
        return typeNameCamel
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