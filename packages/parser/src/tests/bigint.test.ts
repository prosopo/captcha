import { describe, expect, test, it } from 'vitest'
import { bi } from '../parsers/BigIntParser.js';

enum Foo {
    A = 'x',
    B = 2,
    C = 3,
    D = 'y'
}

describe("bigint", () => {
    it("should fail on true", () => {
        expect(() => bi().parse(true)).toThrow();
    });
    
    it("should fail on false", () => {
        expect(() => bi().parse(false)).toThrow();
    });

    it("should error on number", () => {
        expect(() => bi().parse(1)).toThrow();
    })

    it("should error on string", () => {
        expect(() => bi().parse("")).toThrow();
    })

    it("should error on object", () => {
        expect(() => bi().parse({})).toThrow();
    })

    it("should error on array", () => {
        expect(() => bi().parse([])).toThrow();
    })

    it("should error on null", () => {
        expect(() => bi().parse(null)).toThrow();
    })

    it("should error on undefined", () => {
        expect(() => bi().parse(undefined)).toThrow();
    })

    it("should error on NaN", () => {
        expect(() => bi().parse(NaN)).toThrow();
    })

    it("should error on Infinity", () => {
        expect(() => bi().parse(Infinity)).toThrow();
    })

    it("should error on -Infinity", () => {
        expect(() => bi().parse(-Infinity)).toThrow();
    })

    it("should error on function", () => {
        expect(() => bi().parse(() => {})).toThrow();
    })

    it("should error on symbol", () => {
        expect(() => bi().parse(Symbol())).toThrow();
    })

    it("should error on Date", () => {
        expect(() => bi().parse(new Date())).toThrow();
    })

    it("should parse BigInt", () => {
        expect(bi().parse(BigInt(1))).toBe(1n);
    })

    it("should error on Map", () => {
        expect(() => bi().parse(new Map())).toThrow();
    })

    it("should error on Set", () => {
        expect(() => bi().parse(new Set())).toThrow();
    })

    it("should error on WeakMap", () => {
        expect(() => bi().parse(new WeakMap())).toThrow();
    })

    it("should error on WeakSet", () => {
        expect(() => bi().parse(new WeakSet())).toThrow();
    })

    it("should error on ArrayBuffer", () => {
        expect(() => bi().parse(new ArrayBuffer(1))).toThrow();
    })

    it("should error on Int8Array", () => {
        expect(() => bi().parse(new Int8Array(1))).toThrow();
    })

    it("should error on Uint8Array", () => {
        expect(() => bi().parse(new Uint8Array(1))).toThrow();
    })

    it("should error on Uint8ClampedArray", () => {
        expect(() => bi().parse(new Uint8ClampedArray(1))).toThrow();
    })

    it("should error on Int16Array", () => {
        expect(() => bi().parse(new Int16Array(1))).toThrow();
    })

    it("should error on Uint16Array", () => {
        expect(() => bi().parse(new Uint16Array(1))).toThrow();
    })

    it("should error on Int32Array", () => {
        expect(() => bi().parse(new Int32Array(1))).toThrow();
    })

    it("should error on Uint32Array", () => {
        expect(() => bi().parse(new Uint32Array(1))).toThrow();
    })

    it("should error on Float32Array", () => {
        expect(() => bi().parse(new Float32Array(1))).toThrow();
    })

    it("should error on Float64Array", () => {
        expect(() => bi().parse(new Float64Array(1))).toThrow();
    })

    it("should error on BigInt64Array", () => {
        expect(() => bi().parse(new BigInt64Array(1))).toThrow();
    })

    it("should error on BigUint64Array", () => {
        expect(() => bi().parse(new BigUint64Array(1))).toThrow();
    })

    it("should error on native enum variant", () => {
        expect(() => bi().parse(Foo.A)).toThrow();
        expect(() => bi().parse(Foo.B)).toThrow();
        expect(() => bi().parse(Foo.C)).toThrow();
        expect(() => bi().parse(Foo.D)).toThrow();
    })
});