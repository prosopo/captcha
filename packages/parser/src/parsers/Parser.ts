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