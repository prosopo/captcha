import { describe, expect, test } from 'vitest'
import { pString } from '../parsers/StringParser.js'


describe("string", () => {

    test("number", () => {
        expect(() => pString().parse(1)).toThrow()
    })

    test("boolean", () => {
        expect(() => pString().parse(true)).toThrow()
        expect(() => pString().parse(false)).toThrow()
    })

    test("string", () => {
        expect(pString().parse("a")).toEqual("a")
        expect(pString().parse("")).toEqual("")
    })

    test("null", () => {
        expect(() => pString().parse(null)).toThrow()
    })

    test("undefined", () => {
        expect(() => pString().parse(undefined)).toThrow()
    })

    test("symbol", () => {
        expect(() => pString().parse(Symbol())).toThrow()
    })

    test("bigint", () => {
        expect(() => pString().parse(BigInt(1))).toThrow()
    })

    test("object", () => {
        expect(() => pString().parse({ a: 1 })).toThrow()
    })

    test("instance", () => {
        class Foo { }
        const foo = new Foo()
        expect(() => pString().parse(foo)).toThrow()
    })

    test("array", () => {
        expect(() => pString().parse([1])).toThrow()
    })
})