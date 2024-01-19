import { assertType, describe, expect, expectTypeOf, test } from 'vitest'
import { pEnum } from '../parsers/EnumParser.js'

describe("enum", () => {

    test("number", () => {
        expect(pEnum(['a', 1, true]).parse(1)).toEqual(1)
        expect(() => pEnum(['a', 1, true]).parse(2)).toThrow()
    })

    test("boolean", () => {
        expect(pEnum(['a', 1, true]).parse(true)).toEqual(true)
        expect(() => pEnum(['a', 1, true]).parse(false)).toThrow()
    })

    test("string", () => {
        expect(pEnum(['a', 1, true]).parse("a")).toEqual("a")
        expect(() => pEnum(['a', 1, true]).parse("b")).toThrow()
    })

    test("null", () => {
        expect(() => pEnum(['a', 1, true]).parse(undefined)).toThrow()
    })

    test("undefined", () => {
        expect(() => pEnum(['a', 1, true]).parse(null)).toThrow()
    })

    test("symbol", () => {
        const sym = Symbol()
        expect(() => pEnum(['a', 1, true]).parse(sym)).toThrow()
    })

    test("bigint", () => {
        expect(() => pEnum(['a', 1, true]).parse(BigInt(1))).toThrow()
    })

    test("object", () => {
        expect(() => pEnum(['a', 1, true]).parse({ a: 1 })).toThrow()
    })

    test("instance", () => {
        class Foo { }
        const foo = new Foo()
        expect(() => pEnum(['a', 1, true]).parse(foo)).toThrow()
    })

    test("array", () => {
        expect(() => pEnum(['a', 1, true]).parse([1])).toThrow()
    })

    test("native enum", () => {
        enum Foo { A, B, C }
        expect(() => pEnum(['a', 1, true]).parse(Foo.A)).toThrow()
    })

    test("enum", () => {
        const values = ["A", "B", "C"] as const
        expect(pEnum(values).parse(values[0])).toEqual(values[0])
        expect(() => pEnum(values).parse("D")).toThrow()
    })

    test("type", () => {
        type T = "A" | "B" | "C"
        const parser = pEnum(["A", "B", "C"])
        const result = parser.parse("B")
        assertType<T>(result)
    })

    test("variants", () => {
        expect(pEnum(['a', 1, true]).variants).toEqual(['a', 1, true])
    })

    test("tuple", () => {
        expect(() => pEnum(['a', 1, true]).parse(["a", 1, true])).toThrow()
    })
})