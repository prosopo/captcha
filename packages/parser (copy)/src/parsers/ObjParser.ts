

interface Parser<T> {
    parse(value: unknown): T
}

type Schema = {
    [key: string]: Parser<any>
}

type SchemaShape<T extends Schema> = {
    [K in keyof T]: T[K] extends Parser<infer U> ? U : never
}

class ObjParser<T extends Schema> implements Parser<{
    [K in keyof T]: T[K] extends Parser<infer U> ? U : never
}> {

    constructor(private schema: T) {

    }

    readonly shape: SchemaShape<T> = null!

    parse(value: unknown): {
    [K in keyof T]: T[K] extends Parser<infer U> ? U : never
} {
        return null!
    }
}

class StringParser implements Parser<string> {
    parse(value: unknown): string {
        if (typeof value !== 'string') {
            throw new Error(`Expected string but got ${typeof value}`)
        }
        return value
    }
}

class BooleanParser implements Parser<boolean> {
    parse(value: unknown): boolean {
        if (typeof value !== 'boolean') {
            throw new Error(`Expected boolean but got ${typeof value}: ${value}`)
        }
        return value
    }
}

class NumberParser implements Parser<number> {
    parse(value: unknown): number {
        if (typeof value !== 'number') {
            throw new Error(`Expected number but got ${typeof value}`)
        }
        return value
    }
}

const a1 = new ObjParser({
    a: new NumberParser(),
    b: new BooleanParser(),
    c: new StringParser(),
    d: new ObjParser({
        e: new NumberParser(),
        f: new BooleanParser(),
        g: new StringParser(),
    })
})
type A1 = typeof a1.shape;
type A1p2 = typeof a1.parse;
type A1p = ReturnType<typeof a1.parse>