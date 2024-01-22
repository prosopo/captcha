import { assertType, describe, expect, test } from 'vitest'
import { pNumber } from '../parsers/NumberParser.js'
import exp from 'constants'
import { pInstance } from '../parsers/InstanceParser.js'

describe("instance", () => {

    class Bar {}

    test("number", () => {
        expect(() => pInstance(Bar).parse(1)).toThrow()
    })

    test("boolean", () => {
        expect(() => pInstance(Bar).parse(true)).toThrow()
        expect(() => pInstance(Bar).parse(false)).toThrow()
    })

    test("string", () => {
        expect(() => pInstance(Bar).parse("a")).toThrow()
    })

    test("null", () => {
        expect(() => pInstance(Bar).parse(null)).toThrow()
    })

    test("undefined", () => {
        expect(() => pInstance(Bar).parse(undefined)).toThrow()
    })

    test("symbol", () => {
        expect(() => pInstance(Bar).parse(Symbol())).toThrow()
    })

    test("bigint", () => {
        expect(() => pInstance(Bar).parse(BigInt(1))).toThrow()
    })

    test("object", () => {
        expect(() => pInstance(Bar).parse({ a: 1 })).toThrow()
        // {} should match bar, but is not an instance of Bar
        expect(() => pInstance(Bar).parse({})).toThrow()
    })

    test("instance", () => {
        class Foo { }
        expect(() => pInstance(Bar).parse(new Foo())).toThrow()
        expect(pInstance(Bar).parse(new Bar())).toEqual(new Bar())
    })

    test("array", () => {
        expect(() => pInstance(Bar).parse([1])).toThrow()
    })
    
    test("native enum", () => {
        enum Foo { A, B, C }
        expect(() => pInstance(Bar).parse(Foo.A)).toThrow()
    })

    test("enum", () => {
        const values = ["A", "B", "C"] as const
        expect(() => pInstance(Bar).parse(values)).toThrow()
        expect(() => pInstance(Bar).parse(values[0])).toThrow()
    })

    test("type", () => {
        assertType<Bar>(pInstance(Bar).parse(new Bar()))
    })

    test("tuple", () => {
        expect(() => pInstance(Bar).parse(["a", 1, true])).toThrow()
    })
})