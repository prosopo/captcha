import { describe, expect, test } from 'vitest'
import { pUnknown } from '../parsers/UnknownParser.js'

describe("any", () => {

    test("number", () => {
        expect(pUnknown().parse(1)).toEqual(1)
    })

    test("boolean", () => {
        expect(pUnknown().parse(true)).toEqual(true)
        expect(pUnknown().parse(false)).toEqual(false)
    })

    test("string", () => {
        expect(pUnknown().parse("a")).toEqual("a")
        expect(pUnknown().parse("")).toEqual("")
    })

    test("null", () => {
        expect(pUnknown().parse(null)).toEqual(null)
    })

    test("undefined", () => {
        expect(pUnknown().parse(undefined)).toEqual(undefined)
    })

    test("symbol", () => {
        const sym = Symbol()
        expect(pUnknown().parse(sym)).toEqual(sym)
    })

    test("bigint", () => {
        expect(pUnknown().parse(BigInt(1))).toEqual(BigInt(1))
    })

    test("object", () => {
        expect(pUnknown().parse({ a: 1 })).toEqual({ a: 1 })
    })

    test("instance", () => {
        class Foo { }
        const foo = new Foo()
        expect(pUnknown().parse(foo)).toEqual(foo)
        expect(pUnknown().parse(foo)).toBeInstanceOf(Foo)
    })

    test("array", () => {
        expect(pUnknown().parse([1])).toEqual([1])
    })

    test("native enum", () => {
        enum Foo { A, B, C }
        expect(pUnknown().parse(Foo.A)).toEqual(Foo.A)
        expect(pUnknown().parse(Foo.B)).toEqual(Foo.B)
        expect(pUnknown().parse(Foo.C)).toEqual(Foo.C)
    })

    test("enum", () => {
        const values = ["A", "B", "C"] as const
        expect(pUnknown().parse(values)).toEqual(values)
        expect(pUnknown().parse(values[0])).toEqual(values[0])
    })

    test("tuple", () => {
        expect(pUnknown().parse(["a", 1, true])).toEqual(["a", 1, true])
    })
})