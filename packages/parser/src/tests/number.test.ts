import { describe, expect, test, it } from 'vitest'
import { num } from '../parsers/NumberParser.js';

enum Foo {
    A = 'x',
    B = 2,
    C = 3,
    D = 'y'
}

describe("number", () => {
    it("should fail on true", () => {
        expect(() => num().parse(true)).toThrow();
    });
    
    it("should fail on false", () => {
        expect(() => num().parse(false)).toThrow();
    });

    it("should parse number", () => {
        expect(num().parse(1)).toBe(1);
    })

    it("should error on string", () => {
        expect(() => num().parse("")).toThrow();
    })

    it("should error on object", () => {
        expect(() => num().parse({})).toThrow();
    })

    it("should error on array", () => {
        expect(() => num().parse([])).toThrow();
    })

    it("should error on null", () => {
        expect(() => num().parse(null)).toThrow();
    })

    it("should error on undefined", () => {
        expect(() => num().parse(undefined)).toThrow();
    })

    it("should parse NaN", () => {
        expect(num().parse(NaN)).toBe(NaN);
    })

    it("should parse Infinity", () => {
        expect(num().parse(Infinity)).toBe(Infinity);
    })

    it("should parse -Infinity", () => {
        expect(num().parse(-Infinity)).toBe(-Infinity);
    })

    it("should error on function", () => {
        expect(() => num().parse(() => {})).toThrow();
    })

    it("should error on symbol", () => {
        expect(() => num().parse(Symbol())).toThrow();
    })

    it("should error on Date", () => {
        expect(() => num().parse(new Date())).toThrow();
    })

    it("should error on BigInt", () => {
        expect(() => num().parse(BigInt(1))).toThrow();
    })

    it("should error on Map", () => {
        expect(() => num().parse(new Map())).toThrow();
    })

    it("should error on Set", () => {
        expect(() => num().parse(new Set())).toThrow();
    })

    it("should error on WeakMap", () => {
        expect(() => num().parse(new WeakMap())).toThrow();
    })

    it("should error on WeakSet", () => {
        expect(() => num().parse(new WeakSet())).toThrow();
    })

    it("should error on ArrayBuffer", () => {
        expect(() => num().parse(new ArrayBuffer(1))).toThrow();
    })

    it("should error on Int8Array", () => {
        expect(() => num().parse(new Int8Array(1))).toThrow();
    })

    it("should error on Uint8Array", () => {
        expect(() => num().parse(new Uint8Array(1))).toThrow();
    })

    it("should error on Uint8ClampedArray", () => {
        expect(() => num().parse(new Uint8ClampedArray(1))).toThrow();
    })

    it("should error on Int16Array", () => {
        expect(() => num().parse(new Int16Array(1))).toThrow();
    })

    it("should error on Uint16Array", () => {
        expect(() => num().parse(new Uint16Array(1))).toThrow();
    })

    it("should error on Int32Array", () => {
        expect(() => num().parse(new Int32Array(1))).toThrow();
    })

    it("should error on Uint32Array", () => {
        expect(() => num().parse(new Uint32Array(1))).toThrow();
    })

    it("should error on Float32Array", () => {
        expect(() => num().parse(new Float32Array(1))).toThrow();
    })

    it("should error on Float64Array", () => {
        expect(() => num().parse(new Float64Array(1))).toThrow();
    })

    it("should error on BigInt64Array", () => {
        expect(() => num().parse(new BigInt64Array(1))).toThrow();
    })

    it("should error on BigUint64Array", () => {
        expect(() => num().parse(new BigUint64Array(1))).toThrow();
    })

    it("should error on native enum variant", () => {
        expect(() => num().parse(Foo.A)).toThrow();
        expect(() => num().parse(Foo.B)).toThrow();
        expect(() => num().parse(Foo.C)).toThrow();
        expect(() => num().parse(Foo.D)).toThrow();
    })
});