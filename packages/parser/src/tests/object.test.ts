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

    test("extend", () => {
        expect(pObject({ a: pString() }).extend({ b: pNumber() }).parse({ a: "a", b: 1 })).toEqual({ a: "a", b: 1 })
    })

    test("extend type", () => {
        assertType<{ a: string, b: number }>(pObject({ a: pString() }).extend({ b: pNumber() }).parse({ a: "a", b: 1 }))
    })

    test("pick", () => {
        expect(pObject({ a: pString(), b: pNumber(), c: pBoolean() }).pick({ a: true }).parse({ a: "a" })).toEqual({ a: "a" })
        expect(pObject({ a: pString(), b: pNumber(), c: pBoolean() }).pick({ b: true }).parse({ b: 1 })).toEqual({ b: 1 })
        expect(pObject({ a: pString(), b: pNumber(), c: pBoolean() }).pick({ c: true }).parse({ c: true })).toEqual({ c: true })
        expect(() => pObject({ a: pString(), b: pNumber(), c: pBoolean() }).pick({ a: true }).parse({ b: "a" })).toThrow()
    })

    test("pick type", () => {
        assertType<{ a: string }>(pObject({ a: pString(), b: pNumber(), c: pBoolean() }).pick({ a: true }).parse({ a: "a" }))
        assertType<{ b: number }>(pObject({ a: pString(), b: pNumber(), c: pBoolean() }).pick({ b: true }).parse({ b: 1 }))
        assertType<{ c: boolean }>(pObject({ a: pString(), b: pNumber(), c: pBoolean() }).pick({ c: true }).parse({ c: true }))
    })

    test("pick is key based", () => {
        // i.e. the value can be anything, it's the presence of the key that matters
        // e.g. { a: undefined } should pick the 'a' field because there's an entry in the mask for the field 'a', not because the value is undefined
        expect(pObject({ a: pString(), b: pNumber(), c: pBoolean() }).pick({ a: undefined }).parse({ a: 1 })).toEqual({ a: 1 })
        expect(pObject({ a: pString(), b: pNumber(), c: pBoolean() }).pick({ a: null }).parse({ a: 1 })).toEqual({ a: 1 })
        expect(pObject({ a: pString(), b: pNumber(), c: pBoolean() }).pick({ a: false }).parse({ a: 1 })).toEqual({ a: 1 })
    })

    test("omit", () => {
        expect(pObject({ a: pString(), b: pNumber(), c: pBoolean() }).omit({ a: true }).parse({ b: 1, c: true })).toEqual({ b: 1, c: true })
        expect(pObject({ a: pString(), b: pNumber(), c: pBoolean() }).omit({ b: true }).parse({ a: "a", c: true })).toEqual({ a: "a", c: true })
        expect(pObject({ a: pString(), b: pNumber(), c: pBoolean() }).omit({ c: true }).parse({ a: "a", b: 1 })).toEqual({ a: "a", b: 1 })
        expect(() => pObject({ a: pString(), b: pNumber(), c: pBoolean() }).omit({ a: true }).parse({ a: "a" })).toThrow()
    })

    test("omit type", () => {
        assertType<{ b: number, c: boolean }>(pObject({ a: pString(), b: pNumber(), c: pBoolean() }).omit({ a: true }).parse({ b: 1, c: true }))
        assertType<{ a: string, c: boolean }>(pObject({ a: pString(), b: pNumber(), c: pBoolean() }).omit({ b: true }).parse({ a: "a", c: true }))
        assertType<{ a: string, b: number }>(pObject({ a: pString(), b: pNumber(), c: pBoolean() }).omit({ c: true }).parse({ a: "a", b: 1 }))
    })

    test("omit is key based", () => {
        // i.e. the value can be anything, it's the presence of the key that matters
        // e.g. { a: undefined } should omit the 'a' field because there's an entry in the mask for the field 'a', not because the value is undefined
        expect(pObject({ a: pString(), b: pNumber(), c: pBoolean() }).omit({ a: undefined }).parse({ b: 1, c: true })).toEqual({})
        expect(pObject({ a: pString(), b: pNumber(), c: pBoolean() }).omit({ a: null }).parse({ b: 1, c: true })).toEqual({})
        expect(pObject({ a: pString(), b: pNumber(), c: pBoolean() }).omit({ a: false }).parse({ b: 1, c: true })).toEqual({})
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