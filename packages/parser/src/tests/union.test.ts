import { assertType, describe, expect, test } from 'vitest'
import { pUnknown } from '../parsers/UnknownParser.js'
import { pUnion } from '../parsers/UnionParser.js'
import { pString } from '../parsers/StringParser.js'
import { pBoolean } from '../parsers/BooleanParser.js'
import { pNumber } from '../parsers/NumberParser.js'
import { pBigInt } from '../parsers/BigIntParser.js'
import { pObject } from '../parsers/ObjectParser.js'
import { pNativeEnum } from '../parsers/NativeEnumParser.js'
import { pEnum } from '../parsers/EnumParser.js'
import { pTuple } from '../parsers/TupleParser.js'
import { pLiteral } from '../parsers/LiteralParser.js'
import { pArray } from '../parsers/ArrayParser.js'

describe("union", () => {

    test("number", () => {
        expect(pUnion([pString(), pNumber(), pBoolean()]).parse(1)).toEqual(1)
        expect(() => pUnion([pString(), pBoolean()]).parse(1)).toThrow()
    })

    test("boolean", () => {
        expect(pUnion([pString(), pNumber(), pBoolean()]).parse(true)).toEqual(true)
        expect(pUnion([pString(), pNumber(), pBoolean()]).parse(false)).toEqual(false)
        expect(() => pUnion([pString(), pNumber()]).parse(true)).toThrow()
    })

    test("string", () => {
        expect(pUnion([pString(), pNumber(), pBoolean()]).parse("a")).toEqual("a")
        expect(pUnion([pString(), pNumber(), pBoolean()]).parse("")).toEqual("")
        expect(() => pUnion([pNumber(), pBoolean()]).parse("a")).toThrow()
    })

    test("null", () => {
        expect(() => pUnion([pString(), pNumber(), pBoolean()]).parse(null)).toThrow()
        expect(pUnion([pString(), pNumber(), pBoolean(), pLiteral(null)]).parse(null)).toEqual(null)
    })

    test("undefined", () => {
        expect(() => pUnion([pString(), pNumber(), pBoolean()]).parse(undefined)).toThrow()
        expect(pUnion([pString(), pNumber(), pBoolean(), pLiteral(undefined)]).parse(undefined)).toEqual(undefined)
    })

    test("symbol", () => {
        const sym = Symbol()
        expect(() => pUnion([pString(), pNumber(), pBoolean()]).parse(sym)).toThrow()
        expect(pUnion([pString(), pNumber(), pBoolean(), pLiteral(sym)]).parse(sym)).toEqual(sym)
    })

    test("bigint", () => {
        expect(() => pUnion([pString(), pNumber(), pBoolean()]).parse(BigInt(1))).toThrow()
        expect(pUnion([pString(), pNumber(), pBoolean(), pBigInt()]).parse(BigInt(1))).toEqual(BigInt(1))
    })

    test("object", () => {
        expect(() => pUnion([pString(), pNumber(), pBoolean()]).parse({ a: 1 })).toThrow()
        expect(pUnion([pString(), pNumber(), pBoolean(), pObject({ a: pNumber() })]).parse({ a: 1 })).toEqual({ a: 1 })
    })

    test("instance", () => {
        class Foo { }
        const foo = new Foo()
        expect(() => pUnion([pString(), pNumber(), pBoolean()]).parse(foo)).toThrow()
        // TODO instance parser
    })

    test("array", () => {
        expect(() => pUnion([pString(), pNumber(), pBoolean()]).parse([1])).toThrow()
        expect(pUnion([pString(), pNumber(), pBoolean(), pArray(pNumber())]).parse([1])).toEqual([1])
    })

    test("native enum", () => {
        enum Foo { A, B, C }
        expect(pUnion([pString(), pNumber(), pBoolean()]).parse(Foo.A)).toEqual(Foo.A)
        expect(() => pUnion([pString(), pBoolean()]).parse(Foo.A)).toThrow()
        expect(pUnion([pString(), pBoolean(), pNativeEnum(Foo)]).parse(Foo.A)).toEqual(Foo.A)
    })

    test("enum", () => {
        const values = ["A", "B", "C"] as const
        expect(() => pUnion([pNumber(), pBoolean()]).parse(values)).toThrow()
        expect(pUnion([pNumber(), pBoolean(), pEnum(values)]).parse(values[0])).toEqual(values[0])
    })

    test("tuple", () => {
        expect(() => pUnion([pString(), pNumber(), pBoolean()]).parse(["a", 1, true])).toThrow()
        expect(pUnion([pString(), pNumber(), pBoolean(), pTuple([pString(), pNumber(), pBoolean()])]).parse(["a", 1, true])).toEqual(["a", 1, true])
    })

    test("type", () => {
        assertType<string | number | boolean>(pUnion([pString(), pNumber(), pBoolean()]).parse("a"))
        assertType<string | number | boolean>(pUnion([pString(), pNumber(), pBoolean()]).parse(1))
        assertType<string | number | boolean>(pUnion([pString(), pNumber(), pBoolean()]).parse(true))
    })
})