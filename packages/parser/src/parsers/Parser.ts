
export interface Cloneable<T> {
    clone(): T
}

export interface Parser<T> extends Cloneable<Parser<T>> {
    parse(value: unknown): T
}

export abstract class BaseParser<T> implements Parser<T> {
    abstract parse(value: unknown): T
    abstract clone(): Parser<T>
}