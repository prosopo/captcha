import { assertType, describe, expect, test } from 'vitest'
import { pString } from '../parsers/StringParser.js'
import { pIntersect } from '../parsers/IntersectParser.js'
import { pObject } from '../parsers/ObjectParser.js'
import { pBoolean } from '../parsers/BooleanParser.js'
import { pNumber } from '../parsers/NumberParser.js'


describe("intersect", () => {

    const a = pObject({ a: pString() })
    const b = pObject({ b: pNumber() })
    const c = pObject({ c: pBoolean() })

    test("number", () => {
        expect(() => pIntersect([a, b, c]).parse(1)).toThrow()
    })

    test("boolean", () => {
        expect(() => pIntersect([a, b, c]).parse(true)).toThrow()
        expect(() => pIntersect([a, b, c]).parse(false)).toThrow()
    })

    test("string", () => {
        expect(() => pIntersect([a, b, c]).parse("a")).toThrow()
        expect(() => pIntersect([a, b, c]).parse("")).toThrow()
    })

    test("null", () => {
        expect(() => pIntersect([a, b, c]).parse(null)).toThrow()
    })

    test("undefined", () => {
        expect(() => pIntersect([a, b, c]).parse(undefined)).toThrow()
    })

    test("symbol", () => {
        expect(() => pIntersect([a, b, c]).parse(Symbol())).toThrow()
    })

    test("bigint", () => {
        expect(() => pIntersect([a, b, c]).parse(BigInt(1))).toThrow()
    })

    test("object", () => {
        expect(pIntersect([a, b, c]).parse({ a: "a", b: 1, c: true })).toEqual({ a: "a", b: 1, c: true })
        expect(() => pIntersect([a, b, c]).parse({ a: "a", b: 1 })).toThrow()
        // below allows extra keys. TODO implement flag for this
        expect(pIntersect([a, b, c]).parse({ a: "a", b: 1, c: true, d: "d" })).toEqual({ a: "a", b: 1, c: true, d: "d" })
    })

    test("instance", () => {
        class Foo { }
        const foo = new Foo()
        expect(() => pIntersect([a, b, c]).parse(foo)).toThrow()
    })

    test("array", () => {
        expect(() => pIntersect([a, b, c]).parse([1])).toThrow()
    })

    test("native enum", () => {
        enum Foo { A, B, C }
        expect(() => pIntersect([a, b, c]).parse(Foo.A)).toThrow()
    })

    test("enum", () => {
        const values = ["A", "B", "C"] as const
        expect(() => pIntersect([a, b, c]).parse(values)).toThrow()
        expect(() => pIntersect([a, b, c]).parse(values[0])).toThrow()
    })

    test("type", () => {
        assertType<{ a: string; b: number; c: boolean }>(pIntersect([a, b, c]).parse({ a: "a", b: 1, c: true }))
    })

    test("tuple", () => {
        expect(() => pIntersect([a, b, c]).parse(["a", 1, true])).toThrow()
    })
})