import { assertType, describe, expect, test } from 'vitest'
import { pObject } from '../parsers/ObjectParser.js'
import { pString } from '../parsers/StringParser.js'
import { pNumber } from '../parsers/NumberParser.js'
import { pBoolean } from '../parsers/BooleanParser.js'

describe("object", () => {

    test("number", () => {
        expect(() => pObject({ a: pString() }).parse(1)).toThrow()
    })

    test("boolean", () => {
        expect(() => pObject({ a: pString() }).parse(true)).toThrow()
        expect(() => pObject({ a: pString() }).parse(false)).toThrow()
    })

    test("string", () => {
        expect(() => pObject({ a: pString() }).parse("a")).toThrow()
    })

    test("null", () => {
        expect(() => pObject({ a: pString() }).parse(null)).toThrow()
    })

    test("undefined", () => {
        expect(() => pObject({ a: pString() }).parse(undefined)).toThrow()
    })

    test("symbol", () => {
        expect(() => pObject({ a: pString() }).parse(Symbol())).toThrow()
    })

    test("bigint", () => {
        expect(() => pObject({ a: pString() }).parse(BigInt(1))).toThrow()
    })

    test("object", () => {
        expect(pObject({ a: pString() }).parse({ a: "a" })).toEqual({ a: "a" })
        expect(pObject({ a: pString(), b: pNumber(), c: pBoolean() }).parse({ a: "a", b: 1, c: true })).toEqual({ a: "a", b: 1, c: true })
    })

    test("object incorrect property type", () => {
        expect(() => pObject({ a: pString() }).parse({ a: 1 })).toThrow()
    })

    test("instance", () => {
        class Foo { }
        const foo = new Foo()
        expect(() => pObject({ a: pString() }).parse(foo)).toThrow()
    })

    test("array", () => {
        expect(() => pObject({ a: pString() }).parse([1])).toThrow()
    })

    test("native enum", () => {
        enum Foo { A, B, C }
        expect(() => pObject({ a: pString() }).parse(Foo.A)).toThrow()
    })

    test("enum", () => {
        const values = ["A", "B", "C"] as const
        expect(() => pObject({ a: pString() }).parse(values)).toThrow()
        expect(() => pObject({ a: pString() }).parse(values[0])).toThrow()
    })

    test("type", () => {
        assertType<{ a: string }>(pObject({ a: pString() }).parse({ a: "a" }))
    })

    test("tuple", () => {
        expect(() => pObject({ a: pString() }).parse(["a", 1, true])).toThrow()
    })
})