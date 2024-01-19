
export interface Parser<T> {
    parse(value: unknown): T
}

export abstract class BaseParser<T> implements Parser<T> {
    abstract parse(value: unknown): T
}