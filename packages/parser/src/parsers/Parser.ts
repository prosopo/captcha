import {Validator} from "../validators/Validator.js"
import { NullableParser } from "./NullableParser.js"
import { OptionalParser } from "./OptionalParser.js"

// Options for parsing. These are passed to the parse() method.
export interface ParseOptions {
    noStrict?: boolean // whether to allow extra keys in an object. E.g. if expecting object to have shape { a: number }, strict mode would reject parsing { a: 1, b: 2 } whereas non-strict mode would allow it. Note that 'b' would be ignored in the types but would remain present in the underlying object. E.g. the type would be inferred as { a: number } but the value would be { a: 1, b: 2 }, so you cannot access 'b' but it is still there. This is desireable if you've got a big object and you want to parse a small subset of it, but you don't want to have to manually remove the extra keys. This setting defaults to false.
    noStripExtraKeys?: boolean // whether to strip extra keys from an object. E.g. if expecting object to have shape { a: number } and received { a: 1, b: 2 }, stripExtraKeys === true would remove the 'b' entry leaving { a: 1 }
    coerce: boolean // whether to coerce primitives into others, e.g. "5" to number 5, "true" to boolean true, etc. These are the same coercions that happen when using JSON.parse(). This setting defaults to false.
}

// A parser is a class that can parse a value into a given shape. It can also validate the value, throwing an error if it is invalid.
export interface Parser<T> {
    // parse the value, throwing an error if it is invalid due to incorrect shape (or type) or if invalid according to the validators. This returns the parsed value
    parse(value: unknown, options?: ParseOptions): T
    // add a validator to check the value is value when parsing, throwing an error if it is invalid. This returns the parser so that you can chain it with other methods
    ensure(validator: Validator<T>): this
    // validate the value, throwing an error if it is invalid
    validate(value: T): void
    // get the validators
    validators: Validator<T>[] // like gladiators, but less violent
    // make the parser optional, i.e. allow undefined as a value
    optional(): Parser<T | undefined>
    // make the parser nullable, i.e. allow null as a value
    nullable(): Parser<T | null>
    // do the union of two parsers, this parser and another.
    // union<U>(parser: Parser<U>): Parser<T|U>
    // access the shape of the parsed type. This is helpful for pulling the parsed type out of any given parser, e.g. const p = parser.string(); type T = typeof p.shape
    readonly shape: T
}

// The base parser class. This is the class that all other parsers inherit from.
export abstract class BaseParser<T> implements Parser<T> {
    #validators: Validator<T>[] = []

    parse(value: unknown, options?: ParseOptions): T {
        const parsed = this.parseShape(value, options)
        this.validate(parsed)
        return parsed
    }

    // Parse the shape only, without validating it
    abstract parseShape(value: unknown, options?: ParseOptions): T

    validate(value: T): void {
        for (const validator of this.validators) {
            validator.validate(value)
        }
    }

    ensure(validator: Validator<T>): this {
        this.validators.push(validator)
        return this
    }

    get validators(): Validator<T>[] {
        return this.#validators
    }

    set validators(validators: Validator<T>[]) {
        this.#validators = validators
    }

    // union<U>(parser: Parser<U>): Parser<T | U> {
    //     return new UnionParser2(this, parser)
    // }

    get shape(): T {
        throw new Error('Do not call this method')
    }

    optional(): Parser<T | undefined> {
        return new OptionalParser(this)
    }

    nullable(): Parser<T | null> {
        return new NullableParser(this)
    }
}