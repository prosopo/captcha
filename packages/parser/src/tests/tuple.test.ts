import { assertType, describe, expect, test } from 'vitest'
import { pString } from '../parsers/StringParser.js'
import { pNumber } from '../parsers/NumberParser.js'
import { pBoolean } from '../parsers/BooleanParser.js'
import { pTuple } from '../parsers/TupleParser.js'

describe("tuple", () => {

    test("number", () => {
        expect(() => pTuple([pString(), pNumber(), pBoolean()]).parse(1)).toThrow()
    })

    test("boolean", () => {
        expect(() => pTuple([pString(), pNumber(), pBoolean()]).parse(true)).toThrow()
        expect(() => pTuple([pString(), pNumber(), pBoolean()]).parse(false)).toThrow()
    })

    test("string", () => {
        expect(() => pTuple([pString(), pNumber(), pBoolean()]).parse("a")).toThrow()
    })

    test("null", () => {
        expect(() => pTuple([pString(), pNumber(), pBoolean()]).parse(null)).toThrow()
    })

    test("undefined", () => {
        expect(() => pTuple([pString(), pNumber(), pBoolean()]).parse(undefined)).toThrow()
    })

    test("symbol", () => {
        const sym = Symbol()
        expect(() => pTuple([pString(), pNumber(), pBoolean()]).parse(sym)).toThrow()
    })

    test("bigint", () => {
        expect(() => pTuple([pString(), pNumber(), pBoolean()]).parse(BigInt(1))).toThrow()
    })

    test("object", () => {
        expect(() => pTuple([pString(), pNumber(), pBoolean()]).parse({ a: 1 })).toThrow()
    })

    test("instance", () => {
        class Foo { }
        const foo = new Foo()
        expect(() => pTuple([pString(), pNumber(), pBoolean()]).parse(foo)).toThrow()
    })

    test("array", () => {
        expect(() => pTuple([pString(), pNumber(), pBoolean()]).parse([1])).toThrow()
    })

    test("native enum", () => {
        enum Foo { A, B, C }
        expect(() => pTuple([pString(), pNumber(), pBoolean()]).parse(Foo.A)).toThrow()
    })

    test("enum", () => {
        const values = ["A", "B", "C"] as const
        expect(() => pTuple([pString(), pNumber(), pBoolean()]).parse(values)).toThrow()
    })

    test("type", () => {
        assertType<[string, number, boolean]>(pTuple([pString(), pNumber(), pBoolean()]).parse(["a", 1, true]))
    })

    test("tuple", () => {
        expect(pTuple([pString(), pNumber(), pBoolean()]).parse(["a", 1, true])).toEqual(["a", 1, true])
    })
})