import { describe, expect, test } from 'vitest'
import { pBoolean } from '../parsers/BooleanParser.js'

describe("number", () => {

    test("number", () => {
        expect(() => pBoolean().parse(1)).toThrow()
    })

    test("boolean", () => {
        expect(pBoolean().parse(true)).toEqual(true)
        expect(pBoolean().parse(false)).toEqual(false)
    })

    test("string", () => {
        expect(() => pBoolean().parse("a")).toThrow()
    })

    test("null", () => {
        expect(() => pBoolean().parse(null)).toThrow()
    })

    test("undefined", () => {
        expect(() => pBoolean().parse(undefined)).toThrow()
    })

    test("symbol", () => {
        expect(() => pBoolean().parse(Symbol())).toThrow()
    })

    test("bigint", () => {
        expect(() => pBoolean().parse(BigInt(1))).toThrow()
    })

    test("object", () => {
        expect(() => pBoolean().parse({ a: 1 })).toThrow()
    })

    test("instance", () => {
        class Foo { }
        const foo = new Foo()
        expect(() => pBoolean().parse(foo)).toThrow()
    })

    test("array", () => {
        expect(() => pBoolean().parse([1])).toThrow()
    })
})