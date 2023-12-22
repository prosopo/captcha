import { describe, expect, test } from 'vitest'
import { pString } from '../parsers/StringParser.js';
import { pNumber } from '../parsers/NumberParser.js';
import { pBigInt } from '../parsers/BigIntParser.js';
import { pBoolean } from '../parsers/BooleanParser.js';
import { pObject } from '../parsers/ObjectParser.js';
import { pIntersection, pIntersection2 } from '../parsers/IntersectionParser.js';
import { Parser } from '../parsers/Parser.js';

describe("bigint", () => {
    test("parses", () => {
        expect(() => pBigInt().parse(undefined)).toThrowError();
        expect(() => pBigInt().parse(null)).toThrowError();
        expect(() => pBigInt().parse("")).toThrowError();
        expect(() => pBigInt().parse(true)).toThrowError();
        expect(() => pBigInt().parse(123)).toThrowError();
        expect(pBigInt().parse(BigInt(456))).toEqual(BigInt(456));
        expect(() => pBigInt().parse("hello")).toThrowError();
        expect(() => pBigInt().parse("789")).toThrowError();
        expect(() => pBigInt().parse("hello123")).toThrowError();
    });
})

describe("boolean", () => {
    test("parses", () => {
        expect(() => pBoolean().parse(undefined)).toThrowError();
        expect(() => pBoolean().parse(null)).toThrowError();
        expect(() => pBoolean().parse("")).toThrowError();
        expect(pBoolean().parse(true)).toEqual(true);
        expect(() => pBoolean().parse(123)).toThrowError();
        expect(() => pBoolean().parse(BigInt(456))).toThrowError();
        expect(() => pBoolean().parse("hello")).toThrowError();
        expect(() => pBoolean().parse("789")).toThrowError();
        expect(() => pBoolean().parse("hello123")).toThrowError();
    });
})

describe("string", () => {
    test("parses", () => {
        expect(() => pString().parse(undefined)).toThrowError();
        expect(() => pString().parse(null)).toThrowError();
        expect(pString().parse("")).toEqual("");
        expect(() => pString().parse(true)).toThrowError();
        expect(() => pString().parse(123)).toThrowError();
        expect(() => pString().parse(BigInt(456))).toThrowError();
        expect(pString().parse("hello")).toEqual("hello");
        expect(pString().parse("789")).toEqual("789");
        expect(pString().parse("hello123")).toEqual("hello123");
    });
})

describe("number", () => {
    test("parses", () => {
        expect(() => pNumber().parse(undefined)).toThrowError();
        expect(() => pNumber().parse(null)).toThrowError();
        expect(() => pNumber().parse("")).toThrowError();
        expect(() => pNumber().parse(true)).toThrowError();
        expect(pNumber().parse(123)).toEqual(123);
        expect(() => pNumber().parse(BigInt(456))).toThrowError();
        expect(() => pNumber().parse("hello")).toThrowError();
        expect(() => pNumber().parse("789")).toThrowError();
        expect(() => pNumber().parse("hello123")).toThrowError();
    });
})

describe("object", () => {
    test("fails on undefined", () => {
        expect(() => pObject({}).parse(undefined)).toThrowError();
    })

    test("fails on null", () => {
        expect(() => pObject({}).parse(null)).toThrowError();
    })

    test("fails on empty string", () => {
        expect(() => pObject({}).parse("")).toThrowError();
    })

    test("fails on true", () => {
        expect(() => pObject({}).parse(true)).toThrowError();
    })

    test("fails on number", () => {
        expect(() => pObject({}).parse(123)).toThrowError();
    })

    test("fails on bigint", () => {
        expect(() => pObject({}).parse(BigInt(456))).toThrowError();
    })

    test("parses simple object", () => {
        const input: unknown = {
            a: 1,
            b: "hello",
            c: true,
        }
        expect(pObject({
            a: pNumber(),
            b: pString(),
            c: pBoolean(),
        }).parse(input)).toEqual({
            a: 1,
            b: "hello",
            c: true,
        });
    })

    test("parses simple object fail", () => {
        const input: unknown = {
            a: 1,
            b: "hello",
            c: 3,
        }
        expect(() => pObject({
            a: pNumber(),
            b: pString(),
            c: pBoolean(),
        }).parse(input)).toThrowError('3');
    })

    test("parses nested objects", () => {
        const input: unknown = {
            a: 1,
            b: {
                c: "hello",
                d: true,
            },
        }
        expect(pObject({
            a: pNumber(),
            b: pObject({
                c: pString(),
                d: pBoolean(),
            }),
        }).parse(input)).toEqual({
            a: 1,
            b: {
                c: "hello",
                d: true,
            },
        });
    })

    test("parses nested objects fail in nested", () => {
        const input: unknown = {
            a: 1,
            b: {
                c: "hello",
                d: 3,
            },
        }
        expect(() => pObject({
            a: pNumber(),
            b: pObject({
                c: pString(),
                d: pBoolean(),
            }),
        }).parse(input)).toThrowError('3');
    })
})

describe("intersection", () => {
    test("parses", () => {
        const b: Parser<string | number>[] = [pString(), pNumber()]
        // const b: Parser<string | number>[] = [pString(), pNumber()]
        // const a = pIntersection(b).parse("hello")
        const a = pIntersection([pString(), pNumber()]).parse("hello")
        const a2 = pIntersection2([pString(), pNumber()]).parse("hello")
        type t2 = typeof pIntersection2([pString(), pNumber()])
    })
})