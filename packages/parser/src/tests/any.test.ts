import { assertType, describe, expect, test } from 'vitest'
import { pAny } from '../parsers/AnyParser.js'

describe("any", () => {

    test("number", () => {
        expect(pAny().parse(1)).toEqual(1)
    })

    test("boolean", () => {
        expect(pAny().parse(true)).toEqual(true)
        expect(pAny().parse(false)).toEqual(false)
    })

    test("string", () => {
        expect(pAny().parse("a")).toEqual("a")
        expect(pAny().parse("")).toEqual("")
    })

    test("null", () => {
        expect(pAny().parse(null)).toEqual(null)
    })

    test("undefined", () => {
        expect(pAny().parse(undefined)).toEqual(undefined)
    })

    test("symbol", () => {
        const sym = Symbol()
        expect(pAny().parse(sym)).toEqual(sym)
    })

    test("bigint", () => {
        expect(pAny().parse(BigInt(1))).toEqual(BigInt(1))
    })

    test("object", () => {
        expect(pAny().parse({ a: 1 })).toEqual({ a: 1 })
    })

    test("instance", () => {
        class Foo { }
        const foo = new Foo()
        expect(pAny().parse(foo)).toEqual(foo)
        expect(pAny().parse(foo)).toBeInstanceOf(Foo)
    })

    test("array", () => {
        expect(pAny().parse([1])).toEqual([1])
    })

    test("native enum", () => {
        enum Foo { A, B, C }
        expect(pAny().parse(Foo.A)).toEqual(Foo.A)
        expect(pAny().parse(Foo.B)).toEqual(Foo.B)
        expect(pAny().parse(Foo.C)).toEqual(Foo.C)
    })

    test("enum", () => {
        const values = ["A", "B", "C"] as const
        expect(pAny().parse(values[0])).toEqual(values[0])
        expect(pAny().parse(values[1])).toEqual(values[1])
        expect(pAny().parse(values[2])).toEqual(values[2])
    })

    test("type", () => {
        assertType<any>(pAny().parse(true))
        assertType<any>(pAny().parse(false))
        assertType<any>(pAny().parse("a"))
        assertType<any>(pAny().parse(""))
        assertType<any>(pAny().parse(1))
    })

    test("tuple", () => {
        expect(pAny().parse(["a", 1, true])).toEqual(["a", 1, true])
    })
})