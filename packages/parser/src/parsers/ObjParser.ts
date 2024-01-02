

interface Parser2<T> {
    parse(value: unknown): T
}

type Schema = {
    [key: string]: Parser2<any>
}

type SchemaShape<T extends Schema> = {
    [K in keyof T]: T[K] extends Parser2<infer U> ? U : never
}

class ObjParser<T extends Schema> implements Parser2<{
    [K in keyof T]: T[K] extends Parser2<infer U> ? U : never
}> {

    constructor(private schema: T) {

    }

    readonly shape: SchemaShape<T> = null!

    parse(value: unknown): {
    [K in keyof T]: T[K] extends Parser2<infer U> ? U : never
} {
        return null!
    }
}

class StringParser2 implements Parser2<string> {
    parse(value: unknown): string {
        if (typeof value !== 'string') {
            throw new Error(`Expected string but got ${typeof value}`)
        }
        return value
    }
}

class BooleanParser2 implements Parser2<boolean> {
    parse(value: unknown): boolean {
        if (typeof value !== 'boolean') {
            throw new Error(`Expected boolean but got ${typeof value}: ${value}`)
        }
        return value
    }
}

class NumberParser2 implements Parser2<number> {
    parse(value: unknown): number {
        if (typeof value !== 'number') {
            throw new Error(`Expected number but got ${typeof value}`)
        }
        return value
    }
}

const a1 = new ObjParser({
    a: new NumberParser2(),
    b: new BooleanParser2(),
    c: new StringParser2(),
    d: new ObjParser({
        e: new NumberParser2(),
        f: new BooleanParser2(),
        g: new StringParser2(),
    })
})
type A1 = typeof a1.shape;
type A1p2 = typeof a1.parse;
type A1p = ReturnType<typeof a1.parse>