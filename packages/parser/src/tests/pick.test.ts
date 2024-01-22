import { assertType, describe, expect, test } from 'vitest'
import { pBoolean } from '../parsers/BooleanParser.js'
import { pString } from '../parsers/StringParser.js'
import { pPick } from '../parsers/PickParser.js'
import { pNumber } from '../parsers/NumberParser.js'

describe("pick", () => {

    test("number", () => {
        expect(() => pPick({ a: pString(), b: pNumber(), c: pBoolean() }, { a: true }).parse(1)).toThrow()
    })

    test("boolean", () => {
        expect(() => pPick({ a: pString(), b: pNumber(), c: pBoolean() }, { a: true }).parse(true)).toThrow()
        expect(() => pPick({ a: pString(), b: pNumber(), c: pBoolean() }, { a: true }).parse(false)).toThrow()
    })

    test("string", () => {
        expect(() => pPick({ a: pString(), b: pNumber(), c: pBoolean() }, { a: true }).parse("a")).toThrow()
    })

    test("null", () => {
        expect(() => pPick({ a: pString(), b: pNumber(), c: pBoolean() }, { a: true }).parse(null)).toThrow()
    })

    test("undefined", () => {
        expect(() => pPick({ a: pString(), b: pNumber(), c: pBoolean() }, { a: true }).parse(undefined)).toThrow()
    })

    test("symbol", () => {
        expect(() => pPick({ a: pString(), b: pNumber(), c: pBoolean() }, { a: true }).parse(Symbol())).toThrow()
    })

    test("bigint", () => {
        expect(() => pPick({ a: pString(), b: pNumber(), c: pBoolean() }, { a: true }).parse(BigInt(1))).toThrow()
    })

    test("object", () => {
        expect(pPick({ a: pString(), b: pNumber(), c: pBoolean() }, { a: true }).parse({ a: "a" })).toEqual({ a: "a" })
        expect(pPick({ a: pString(), b: pNumber(), c: pBoolean() }, { b: true }).parse({ a: "a", b: 1, c: true })).toEqual({ b: 1 })
        expect(pPick({ a: pString(), b: pNumber(), c: pBoolean() }, { a: true, b: true }).parse({ a: "a", b: 1, c: true })).toEqual({ a: "a", b: 1 })
        expect(pPick({ a: pString(), b: pNumber(), c: pBoolean() }, { a: true, b: true, c: true }).parse({ a: "a", b: 1, c: true })).toEqual({ a: "a", b: 1, c: true })
        expect(pPick({ a: pString(), b: pNumber(), c: pBoolean() }, {}).parse({ a: "a", b: 1, c: true })).toEqual({})
    })

    test("instance", () => {
        class Foo { }
        const foo = new Foo()
        expect(() => pPick({ a: pString(), b: pNumber(), c: pBoolean() }, { a: true }).parse(foo)).toThrow()
    })

    test("array", () => {
        expect(() => pPick({ a: pString(), b: pNumber(), c: pBoolean() }, { a: true }).parse([1])).toThrow()
    })

    test("native enum", () => {
        enum Foo { A, B, C }
        expect(() => pPick({ a: pString(), b: pNumber(), c: pBoolean() }, { a: true }).parse(Foo.A)).toThrow()
    })

    test("enum", () => {
        const values = ["A", "B", "C"] as const
        expect(() => pPick({ a: pString(), b: pNumber(), c: pBoolean() }, { a: true }).parse(values)).toThrow()
    })

    test("type", () => {
        const parser = pPick({ a: pString(), b: pNumber(), c: pBoolean() }, { a: true })
        const result = parser.parse({ a: "a", b: 1, c: true })
        assertType<{ a: string }>(result)
    })

    test("tuple", () => {
        expect(() => pPick({ a: pString(), b: pNumber(), c: pBoolean() }, { a: true }).parse(["a", 1, true])).toThrow()
    })
})