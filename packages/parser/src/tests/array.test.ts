import { assertType, describe, expect, test } from 'vitest'
import { pArray } from '../parsers/ArrayParser.js'
import { pString } from '../parsers/StringParser.js'
import { pNumber } from '../parsers/NumberParser.js'
import { pBoolean } from '../parsers/BooleanParser.js'


describe("array", () => {

    test("number", () => {
        expect(() => pArray(pString()).parse(1)).toThrow()
    })

    test("boolean", () => {
        expect(() => pArray(pString()).parse(true)).toThrow()
        expect(() => pArray(pString()).parse(false)).toThrow()
    })

    test("string", () => {
        expect(pArray(pString()).parse(["a"])).toEqual(["a"])
        expect(pArray(pString()).parse([])).toEqual([])
    })

    test("null", () => {
        expect(() => pArray(pString()).parse(null)).toThrow()
    })

    test("undefined", () => {
        expect(() => pArray(pString()).parse(undefined)).toThrow()
    })

    test("symbol", () => {
        expect(() => pArray(pString()).parse(Symbol())).toThrow()
    })

    test("bigint", () => {
        expect(() => pArray(pString()).parse(BigInt(1))).toThrow()
    })

    test("object", () => {
        expect(() => pArray(pString()).parse({ a: 1 })).toThrow()
    })

    test("instance", () => {
        class Foo { }
        const foo = new Foo()
        expect(() => pArray(pString()).parse(foo)).toThrow()
    })

    test("array incorrect element type", () => {
        expect(() => pArray(pString()).parse([1])).toThrow()
    })

    test("array correct element type", () => {
        expect(pArray(pString()).parse(["a"])).toEqual(["a"])
    })

    test("array empty", () => {
        expect(pArray(pString()).parse([])).toEqual([])
    })

    test("native enum", () => {
        enum Foo { A, B, C }
        expect(() => pArray(pString()).parse(Foo.A)).toThrow()
    })

    test("enum", () => {
        const values = ["A", "B", "C"] as const
        expect(pArray(pString()).parse(values)).toEqual(values)
        expect(() => pArray(pString()).parse(values[0])).toThrow()
    })

    test("type", () => {
        assertType<string[]>(pArray(pString()).parse(["a"]))
        assertType<number[]>(pArray(pNumber()).parse([1]))
        assertType<boolean[]>(pArray(pBoolean()).parse([true]))
    })

    test("tuple", () => {
        expect(() => pArray(pString()).parse(["a", 1, true])).toThrow()
    })
})