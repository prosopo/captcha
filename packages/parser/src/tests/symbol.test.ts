import { describe, expect, test, it } from 'vitest'
import { symbol } from '../parsers/SymbolParser.js';

describe("symbol", () => {
    it("should error on true", () => {
        expect(() => symbol().parse(true)).toThrow();
    });
    
    it("should error on false", () => {
        expect(() => symbol().parse(false)).toThrow();
    });

    it("should error on number", () => {
        expect(() => symbol().parse(1)).toThrow();
    })

    it("should error on string", () => {
        expect(() => symbol().parse("")).toThrow();
    })

    it("should error on object", () => {
        expect(() => symbol().parse({})).toThrow();
    })

    it("should error on array", () => {
        expect(() => symbol().parse([])).toThrow();
    })

    it("should error on null", () => {
        expect(() => symbol().parse(null)).toThrow();
    })

    it("should error on undefined", () => {
        expect(() => symbol().parse(undefined)).toThrow();
    })

    it("should error on NaN", () => {
        expect(() => symbol().parse(NaN)).toThrow();
    })

    it("should error on Infinity", () => {
        expect(() => symbol().parse(Infinity)).toThrow();
    })

    it("should error on -Infinity", () => {
        expect(() => symbol().parse(-Infinity)).toThrow();
    })

    it("should error on function", () => {
        expect(() => symbol().parse(() => {})).toThrow();
    })

    it("should parse symbol", () => {
        const sym = Symbol();
        expect(symbol().parse(sym)).toBe(sym);
    })

    it("should error on Date", () => {
        expect(() => symbol().parse(new Date())).toThrow();
    })

    it("should error on BigInt", () => {
        expect(() => symbol().parse(BigInt(1))).toThrow();
    })

    it("should error on Map", () => {
        expect(() => symbol().parse(new Map())).toThrow();
    })

    it("should error on Set", () => {
        expect(() => symbol().parse(new Set())).toThrow();
    })

    it("should error on WeakMap", () => {
        expect(() => symbol().parse(new WeakMap())).toThrow();
    })

    it("should error on WeakSet", () => {
        expect(() => symbol().parse(new WeakSet())).toThrow();
    })

    it("should error on ArrayBuffer", () => {
        expect(() => symbol().parse(new ArrayBuffer(1))).toThrow();
    })

    it("should error on Int8Array", () => {
        expect(() => symbol().parse(new Int8Array(1))).toThrow();
    })

    it("should error on Uint8Array", () => {
        expect(() => symbol().parse(new Uint8Array(1))).toThrow();
    })

    it("should error on Uint8ClampedArray", () => {
        expect(() => symbol().parse(new Uint8ClampedArray(1))).toThrow();
    })

    it("should error on Int16Array", () => {
        expect(() => symbol().parse(new Int16Array(1))).toThrow();
    })

    it("should error on Uint16Array", () => {
        expect(() => symbol().parse(new Uint16Array(1))).toThrow();
    })

    it("should error on Int32Array", () => {
        expect(() => symbol().parse(new Int32Array(1))).toThrow();
    })

    it("should error on Uint32Array", () => {
        expect(() => symbol().parse(new Uint32Array(1))).toThrow();
    })

    it("should error on Float32Array", () => {
        expect(() => symbol().parse(new Float32Array(1))).toThrow();
    })

    it("should error on Float64Array", () => {
        expect(() => symbol().parse(new Float64Array(1))).toThrow();
    })

    it("should error on BigInt64Array", () => {
        expect(() => symbol().parse(new BigInt64Array(1))).toThrow();
    })

    it("should error on BigUint64Array", () => {
        expect(() => symbol().parse(new BigUint64Array(1))).toThrow();
    })
});