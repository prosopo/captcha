// Options for parsing. These are passed to the parse() method.
export interface ParseOptions {
    noStrict?: boolean // whether to allow extra keys in an object. E.g. if expecting object to have shape { a: number }, strict mode would reject parsing { a: 1, b: 2 } whereas non-strict mode would allow it. Note that 'b' would be ignored in the types but would remain present in the underlying object. E.g. the type would be inferred as { a: number } but the value would be { a: 1, b: 2 }, so you cannot access 'b' but it is still there. This is desireable if you've got a big object and you want to parse a small subset of it, but you don't want to have to manually remove the extra keys. This setting defaults to false.
    noStripExtraKeys?: boolean // whether to strip extra keys from an object. E.g. if expecting object to have shape { a: number } and received { a: 1, b: 2 }, stripExtraKeys === true would remove the 'b' entry leaving { a: 1 }
    coerce?: boolean // whether to coerce primitives into others, e.g. "5" to number 5, "true" to boolean true, etc. These are the same coercions that happen when using JSON.parse(). This setting defaults to false.
}

export interface Transformer<T, U> {
    transform(value: T, options?: Readonly<U>): T
}

// A parser is a class that can parse a value into a given shape. It can also validate the value, throwing an error if it is invalid.
export interface Parser<T, U> {
    // parse the value, throwing an error if it is invalid due to incorrect shape or type. Transformers may throw errors if they fail to transform the value, e.g. ensuring number within certain range.
    parse(value: unknown, options?: U): T
    // add a pre-parse transformer.
    before(transformer: Transformer<unknown, U>): this
    // add a post-parse transformer.
    after(transformer: Transformer<T, U>): this
    // transformers get applied before and after parsing to adjust the value accordingly. This is useful for validation and coercion. E.g. you could have a transformer that converts a string to a number, or a transformer that checks a number is within a certain range. Transformers are applied in order.
    beforeSteps: Transformer<unknown, U>[] // optimus prime
    afterSteps: Transformer<T, U>[] // bubble bee
    // the shape of the output after parsing. The value of this variable will always be null, intended usage is `declare const parser: Parser<T>; type shape = typeof parser.shape;`
    readonly shape: T
    // default options for parsing. These are merged with the options passed to the parse() method to provide defaults.
    defaultOptions: U
}

// The base parser class. This is the class that all other parsers inherit from.
export abstract class BaseParser<T, U extends {}> implements Parser<T, U> {
    beforeSteps: Transformer<unknown, U>[] = []
    afterSteps: Transformer<T, U>[] = []
    // the default options for parsing. These are merged with the options passed to the parse() method to provide defaults.
    defaultOptions: U

    constructor(defaultOptions?: U) {
        this.defaultOptions = defaultOptions ?? {} as U
    }

    // parse the value, applying transformers before and after parsing. This should be overriden by subclasses.
    parse(value: unknown, options?: Readonly<U>): T {
        // merge the default options with the options passed to this method
        options = { ...this.defaultOptions, ...options }
        // apply the pre-parse transformers
        value = this.beforeSteps.reduce((value, transformer) => transformer.transform(value), value)
        // parse the value
        let parsed = this._parse(value, options)
        // apply the post-parse transformers
        parsed = this.afterSteps.reduce((value, transformer) => transformer.transform(value), parsed)
        return parsed
    }

    before(transformer: Transformer<unknown, U>): this {
        this.beforeSteps.push(transformer)
        return this
    }

    after(transformer: Transformer<T, U>): this {
        this.afterSteps.push(transformer)
        return this
    }

    // Parse the value without applying transforms. This should be overriden by subclasses and not called directly.
    abstract _parse(value: unknown, options?: Readonly<U>): T

    get shape(): T {
        throw new Error('Do not use the shape property directly. Use `typeof parser.shape` instead.')
    }

}