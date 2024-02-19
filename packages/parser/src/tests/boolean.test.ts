import { describe, expect, test, it } from 'vitest'
import { bool } from '../parsers/BooleanParser.js';

enum Foo {
    A = 'x',
    B = 2,
    C = 3,
    D = 'y'
}

class Bar {
    readonly bar = 1;
}

class Baz {
    readonly baz = 2;
}

describe("boolean", () => {
    it("should parse true", () => {
        expect(bool().parse(true)).toBe(true);
    });
    
    it("should parse false", () => {
        expect(bool().parse(false)).toBe(false);
    });

    it("should error on number", () => {
        expect(() => bool().parse(1)).toThrow();
    })

    it("should error on string", () => {
        expect(() => bool().parse("")).toThrow();
    })

    it("should error on object", () => {
        expect(() => bool().parse({})).toThrow();
    })

    it("should error on array", () => {
        expect(() => bool().parse([])).toThrow();
    })

    it("should error on null", () => {
        expect(() => bool().parse(null)).toThrow();
    })

    it("should error on undefined", () => {
        expect(() => bool().parse(undefined)).toThrow();
    })

    it("should error on NaN", () => {
        expect(() => bool().parse(NaN)).toThrow();
    })

    it("should error on Infinity", () => {
        expect(() => bool().parse(Infinity)).toThrow();
    })

    it("should error on -Infinity", () => {
        expect(() => bool().parse(-Infinity)).toThrow();
    })

    it("should error on function", () => {
        expect(() => bool().parse(() => {})).toThrow();
    })

    it("should error on symbol", () => {
        expect(() => bool().parse(Symbol())).toThrow();
    })

    it("should error on Date", () => {
        expect(() => bool().parse(new Date())).toThrow();
    })

    it("should error on BigInt", () => {
        expect(() => bool().parse(BigInt(1))).toThrow();
    })

    it("should error on Map", () => {
        expect(() => bool().parse(new Map())).toThrow();
    })

    it("should error on Set", () => {
        expect(() => bool().parse(new Set())).toThrow();
    })

    it("should error on WeakMap", () => {
        expect(() => bool().parse(new WeakMap())).toThrow();
    })

    it("should error on WeakSet", () => {
        expect(() => bool().parse(new WeakSet())).toThrow();
    })

    it("should error on ArrayBuffer", () => {
        expect(() => bool().parse(new ArrayBuffer(1))).toThrow();
    })

    it("should error on Int8Array", () => {
        expect(() => bool().parse(new Int8Array(1))).toThrow();
    })

    it("should error on Uint8Array", () => {
        expect(() => bool().parse(new Uint8Array(1))).toThrow();
    })

    it("should error on Uint8ClampedArray", () => {
        expect(() => bool().parse(new Uint8ClampedArray(1))).toThrow();
    })

    it("should error on Int16Array", () => {
        expect(() => bool().parse(new Int16Array(1))).toThrow();
    })

    it("should error on Uint16Array", () => {
        expect(() => bool().parse(new Uint16Array(1))).toThrow();
    })

    it("should error on Int32Array", () => {
        expect(() => bool().parse(new Int32Array(1))).toThrow();
    })

    it("should error on Uint32Array", () => {
        expect(() => bool().parse(new Uint32Array(1))).toThrow();
    })

    it("should error on Float32Array", () => {
        expect(() => bool().parse(new Float32Array(1))).toThrow();
    })

    it("should error on Float64Array", () => {
        expect(() => bool().parse(new Float64Array(1))).toThrow();
    })

    it("should error on BigInt64Array", () => {
        expect(() => bool().parse(new BigInt64Array(1))).toThrow();
    })

    it("should error on BigUint64Array", () => {
        expect(() => bool().parse(new BigUint64Array(1))).toThrow();
    })

    it("should error on native enum variant", () => {
        expect(() => bool().parse(Foo.A)).toThrow();
        expect(() => bool().parse(Foo.B)).toThrow();
        expect(() => bool().parse(Foo.C)).toThrow();
        expect(() => bool().parse(Foo.D)).toThrow();
    })

    it("should error on instance", () => {
        expect(() => bool().parse(new Bar())).toThrow();
        expect(() => bool().parse(new Baz())).toThrow();
    })
});