// // Options for parsing. These are passed to the parse() method.
// export interface ParseOptions {
//     noStrict?: boolean // whether to allow extra keys in an object. E.g. if expecting object to have shape { a: number }, strict mode would reject parsing { a: 1, b: 2 } whereas non-strict mode would allow it. Note that 'b' would be ignored in the types but would remain present in the underlying object. E.g. the type would be inferred as { a: number } but the value would be { a: 1, b: 2 }, so you cannot access 'b' but it is still there. This is desireable if you've got a big object and you want to parse a small subset of it, but you don't want to have to manually remove the extra keys. This setting defaults to false.
//     noStripExtraKeys?: boolean // whether to strip extra keys from an object. E.g. if expecting object to have shape { a: number } and received { a: 1, b: 2 }, stripExtraKeys === true would remove the 'b' entry leaving { a: 1 }
//     coerce?: boolean // whether to coerce primitives into others, e.g. "5" to number 5, "true" to boolean true, etc. These are the same coercions that happen when using JSON.parse(). This setting defaults to false.
// }


// Type that maps an object's properties to parsers for those properties
export type Parseable<T> = {
    [Property in keyof T]: Parser<T[Property]>
}

export interface Transformer<T> {
    transform(value: T): T
}

// A parser is a class that can parse a value into a given shape. It can also validate the value, throwing an error if it is invalid.
export interface Parser<T> {
    // parse the value, throwing an error if it is invalid due to incorrect shape or type. Transformers may throw errors during if they fail to transform the value, e.g. ensuring number within certain range.
    parse(value: unknown): T
    // add a pre-parse transformer.
    before(transformer: Transformer<unknown>): this
    // add a post-parse transformer.
    after(transformer: Transformer<T>): this
    // transformers get applied before and after parsing to adjust the value accordingly. This is useful for validation and coercion. E.g. you could have a transformer that converts a string to a number, or a transformer that checks a number is within a certain range. Transformers are applied in order.
    beforeSteps: Transformer<unknown>[] // optimus prime
    afterSteps: Transformer<T>[] // bubble bee
    // the shape of the output after parsing. The value of this variable will always be null, intended usage is `declare const parser: Parser<T>; type shape = typeof parser.shape;`
    readonly shape: T
}

// The base parser class. This is the class that all other parsers inherit from.
export abstract class BaseParser<T> implements Parser<T> {
    beforeSteps: Transformer<unknown>[] = []
    afterSteps: Transformer<T>[] = []

    // parse the value, applying transformers before and after parsing. This should be overriden by subclasses.
    parse(value: unknown): T {
        // apply the pre-parse transformers
        value = this.beforeSteps.reduce((value, transformer) => transformer.transform(value), value)
        // parse the value
        let parsed = this._parse(value)
        // apply the post-parse transformers
        parsed = this.afterSteps.reduce((value, transformer) => transformer.transform(value), parsed)
        return parsed
    }

    before(transformer: Transformer<unknown>): this {
        this.beforeSteps.push(transformer)
        return this
    }

    after(transformer: Transformer<T>): this {
        this.afterSteps.push(transformer)
        return this
    }

    // Parse the value without applying transforms. This should be overriden by subclasses and not called directly.
    abstract _parse(value: unknown): T

    get shape(): T {
        throw new Error('Do not use the shape property directly. Use `typeof parser.shape` instead.')
    }

}