import { describe, expect, test } from 'vitest'
import { pLiteral } from '../parsers/LiteralParser.js'

describe("literal", () => {
    
    test("number", () => {
        expect(pLiteral(1).parse(1)).toEqual(1)
        expect(() => pLiteral(1).parse(2)).toThrow()
    })

    test("boolean", () => {
        expect(pLiteral(true).parse(true)).toEqual(true)
        expect(pLiteral(false).parse(false)).toEqual(false)
        expect(() => pLiteral(true).parse(false)).toThrow()
        expect(() => pLiteral(false).parse(true)).toThrow()
    })

    test("string", () => {
        expect(pLiteral("a").parse("a")).toEqual("a")
        expect(() => pLiteral("a").parse("b")).toThrow()
    })

    test("null", () => {
        expect(pLiteral(null).parse(null)).toEqual(null)
        expect(() => pLiteral(null).parse(undefined)).toThrow()
    })

    test("undefined", () => {
        expect(pLiteral(undefined).parse(undefined)).toEqual(undefined)
        expect(() => pLiteral(undefined).parse(null)).toThrow()
    })

    test("symbol", () => {
        const sym = Symbol()
        expect(pLiteral(sym).parse(sym)).toEqual(sym)
        expect(() => pLiteral(sym).parse(Symbol())).toThrow()
    })

    test("bigint", () => {
        expect(pLiteral(BigInt(1)).parse(BigInt(1))).toEqual(BigInt(1))
        expect(() => pLiteral(BigInt(1)).parse(BigInt(2))).toThrow()
    })

    test("object", () => {
        const obj = { a: 1 }
        expect(pLiteral(obj).parse(obj)).toEqual(obj)
        expect(() => pLiteral(obj).parse({ a: 2 })).toThrow()
    })

    test("instance", () => {
        class Foo { }
        class Bar { }
        const foo = new Foo()
        expect(pLiteral(foo).parse(foo)).toEqual(foo)
        expect(() => pLiteral(foo).parse(new Bar())).toThrow()
    })

    test("array", () => {
        const arr = [1]
        expect(pLiteral(arr).parse(arr)).toEqual(arr)
        expect(() => pLiteral(arr).parse([2])).toThrow()
    })
})