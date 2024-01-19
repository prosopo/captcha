import { assertType, describe, expect, expectTypeOf, test } from 'vitest'
import { pNativeEnum } from '../parsers/NativeEnumParser.js'

describe("nativeEnum", () => {

    enum Foo { A, B, C }
    enum Bar {
        A = "A",
        B = "B",
        C = "C",
    }
    enum Qux {
        A = 1,
        B = 2,
        C = 3,
    }
    enum Tux {
        A = 'x',
        B = 31,
        C = '',
    }

    test("number", () => {
        expect(pNativeEnum(Foo).parse(1)).toEqual(Foo.B)
        expect(() => pNativeEnum(Foo).parse(4)).toThrow()
        expect(() => pNativeEnum(Bar).parse(1)).toThrow()
        expect(() => pNativeEnum(Bar).parse(4)).toThrow()
        expect(pNativeEnum(Qux).parse(1)).toEqual(Qux.A)
        expect(() => pNativeEnum(Qux).parse(4)).toThrow()
        expect(() => pNativeEnum(Tux).parse(1)).toThrow()
        expect(() => pNativeEnum(Tux).parse(4)).toThrow()
        expect(pNativeEnum(Tux).parse(31)).toEqual(Tux.B)
    })

    test("boolean", () => {
        expect(() => pNativeEnum(Foo).parse(true)).toThrow()
        expect(() => pNativeEnum(Foo).parse(false)).toThrow()
        expect(() => pNativeEnum(Bar).parse(true)).toThrow()
        expect(() => pNativeEnum(Bar).parse(false)).toThrow()
        expect(() => pNativeEnum(Qux).parse(true)).toThrow()
        expect(() => pNativeEnum(Qux).parse(false)).toThrow()
        expect(() => pNativeEnum(Tux).parse(true)).toThrow()
        expect(() => pNativeEnum(Tux).parse(false)).toThrow()
    })

    test("string", () => {
        expect(() => pNativeEnum(Foo).parse("A")).toThrow()
        expect(pNativeEnum(Bar).parse("A")).toEqual(Bar.A)
        expect(() => pNativeEnum(Qux).parse("A")).toThrow()
        expect(() => pNativeEnum(Tux).parse("A")).toThrow()
        expect(pNativeEnum(Tux).parse("x")).toEqual(Tux.A)
        expect(pNativeEnum(Tux).parse("")).toEqual(Tux.C)
    })

    test("null", () => {
        expect(() => pNativeEnum(Foo).parse(null)).toThrow()
        expect(() => pNativeEnum(Bar).parse(null)).toThrow()
        expect(() => pNativeEnum(Qux).parse(null)).toThrow()
        expect(() => pNativeEnum(Tux).parse(null)).toThrow()
    })

    test("undefined", () => {
        expect(() => pNativeEnum(Foo).parse(undefined)).toThrow()
        expect(() => pNativeEnum(Bar).parse(undefined)).toThrow()
        expect(() => pNativeEnum(Qux).parse(undefined)).toThrow()
        expect(() => pNativeEnum(Tux).parse(undefined)).toThrow()
    })

    test("symbol", () => {
        const sym = Symbol()
        expect(() => pNativeEnum(Foo).parse(sym)).toThrow()
        expect(() => pNativeEnum(Bar).parse(sym)).toThrow()
        expect(() => pNativeEnum(Qux).parse(sym)).toThrow()
        expect(() => pNativeEnum(Tux).parse(sym)).toThrow()
    })

    test("bigint", () => {
        expect(() => pNativeEnum(Foo).parse(BigInt(1))).toThrow()
        expect(() => pNativeEnum(Bar).parse(BigInt(1))).toThrow()
        expect(() => pNativeEnum(Qux).parse(BigInt(1))).toThrow()
        expect(() => pNativeEnum(Tux).parse(BigInt(1))).toThrow()
    })

    test("object", () => {
        expect(() => pNativeEnum(Foo).parse({ a: 1 })).toThrow()
        expect(() => pNativeEnum(Bar).parse({ a: 1 })).toThrow()
        expect(() => pNativeEnum(Qux).parse({ a: 1 })).toThrow()
        expect(() => pNativeEnum(Tux).parse({ a: 1 })).toThrow()
    })

    test("instance", () => {
        class Foo2 { }
        const foo2 = new Foo2()
        expect(() => pNativeEnum(Foo).parse(foo2)).toThrow()
        expect(() => pNativeEnum(Bar).parse(foo2)).toThrow()
        expect(() => pNativeEnum(Qux).parse(foo2)).toThrow()
        expect(() => pNativeEnum(Tux).parse(foo2)).toThrow()
    })

    test("array", () => {
        expect(() => pNativeEnum(Foo).parse([1])).toThrow()
        expect(() => pNativeEnum(Bar).parse([1])).toThrow()
        expect(() => pNativeEnum(Qux).parse([1])).toThrow()
        expect(() => pNativeEnum(Tux).parse([1])).toThrow()
    })

    test("native enum", () => {
        expect(pNativeEnum(Foo).parse(Foo.A)).toEqual(Foo.A)
        expect(pNativeEnum(Foo).parse(Foo.B)).toEqual(Foo.B)
        expect(pNativeEnum(Foo).parse(Foo.C)).toEqual(Foo.C)
        expect(() => pNativeEnum(Foo).parse(Bar.A)).toThrow() // different values, so should throw
        expect(() => pNativeEnum(Foo).parse(Bar.B)).toThrow()
        expect(() => pNativeEnum(Foo).parse(Bar.C)).toThrow()
        expect(pNativeEnum(Foo).parse(Qux.A)).toEqual(Foo.B) // out-of-order values
        expect(pNativeEnum(Foo).parse(Qux.B)).toEqual(Foo.C)
        expect(() => pNativeEnum(Foo).parse(Qux.C)).toThrow() // 3 out of range on Foo as Foo is 0, 1, 2 for A, B, C
        expect(() => pNativeEnum(Foo).parse(Tux.A)).toThrow() // different types, so should throw
        expect(() => pNativeEnum(Foo).parse(Tux.B)).toThrow() // out of range
        expect(() => pNativeEnum(Foo).parse(Tux.C)).toThrow() // different types, so should throw
    })

    test("enum", () => {
        const values = ["A", "B", "C"] as const
        expect(() => pNativeEnum(Foo).parse(values)).toThrow()
        expect(() => pNativeEnum(Foo).parse(values[0])).toThrow()
        expect(() => pNativeEnum(Bar).parse(values)).toThrow()
        expect(pNativeEnum(Bar).parse(values[0])).toEqual(Bar.A) // matches values
        expect(() => pNativeEnum(Qux).parse(values)).toThrow()
        expect(() => pNativeEnum(Qux).parse(values[0])).toThrow()
        expect(() => pNativeEnum(Tux).parse(values)).toThrow()
        expect(() => pNativeEnum(Tux).parse(values[0])).toThrow()
    })

    test("type", () => {
        assertType<Foo>(pNativeEnum(Foo).parse(Foo.A))
        assertType<Foo>(pNativeEnum(Foo).parse(Foo.B))
        assertType<Foo>(pNativeEnum(Foo).parse(Foo.C))
        assertType<Bar>(pNativeEnum(Bar).parse(Bar.A))
        assertType<Bar>(pNativeEnum(Bar).parse(Bar.B))
        assertType<Bar>(pNativeEnum(Bar).parse(Bar.C))
        assertType<Qux>(pNativeEnum(Qux).parse(Qux.A))
        assertType<Qux>(pNativeEnum(Qux).parse(Qux.B))
        assertType<Qux>(pNativeEnum(Qux).parse(Qux.C))
        assertType<Tux>(pNativeEnum(Tux).parse(Tux.A))
        assertType<Tux>(pNativeEnum(Tux).parse(Tux.B))
        assertType<Tux>(pNativeEnum(Tux).parse(Tux.C))
    })

    test("variants", () => {
        expect(pNativeEnum(Foo).variants).toEqual([Foo.A, Foo.B, Foo.C])
        expect(pNativeEnum(Bar).variants).toEqual([Bar.A, Bar.B, Bar.C])
        expect(pNativeEnum(Qux).variants).toEqual([Qux.A, Qux.B, Qux.C])
        expect(pNativeEnum(Tux).variants).toEqual([Tux.A, Tux.B, Tux.C])
    })

    test("tuple", () => {
        expect(() => pNativeEnum(Foo).parse(["a", 1, true])).toThrow()
        expect(() => pNativeEnum(Bar).parse(["a", 1, true])).toThrow()
        expect(() => pNativeEnum(Qux).parse(["a", 1, true])).toThrow()
        expect(() => pNativeEnum(Tux).parse(["a", 1, true])).toThrow()
    })
})