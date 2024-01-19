import { describe, expect, test } from 'vitest'
import { pNumber } from '../parsers/NumberParser.js'
import exp from 'constants'

describe("number", () => {

    test("number", () => {
        expect(pNumber().parse(1)).toEqual(1)
    })

    test("boolean", () => {
        expect(() => pNumber().parse(true)).toThrow()
        expect(() => pNumber().parse(false)).toThrow()
    })

    test("string", () => {
        expect(() => pNumber().parse("a")).toThrow()
    })

    test("null", () => {
        expect(() => pNumber().parse(null)).toThrow()
    })

    test("undefined", () => {
        expect(() => pNumber().parse(undefined)).toThrow()
    })

    test("symbol", () => {
        expect(() => pNumber().parse(Symbol())).toThrow()
    })

    test("bigint", () => {
        expect(() => pNumber().parse(BigInt(1))).toThrow()
    })

    test("object", () => {
        expect(() => pNumber().parse({ a: 1 })).toThrow()
    })

    test("instance", () => {
        class Foo { }
        expect(() => pNumber().parse(new Foo())).toThrow()
    })

    test("array", () => {
        expect(() => pNumber().parse([1])).toThrow()
    })
})