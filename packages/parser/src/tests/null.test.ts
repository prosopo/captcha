import { describe, expect, test, it, expectTypeOf } from 'vitest'
import { nul } from '../parsers/NullParser.js';

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

describe("null", () => {
    it("should parse to correct type", () => {
        expectTypeOf(() => nul().parse(null)).returns.toMatchTypeOf<null>();
    })

    it("should error on true", () => {
        expect(() => nul().parse(true)).toThrow();
    });
    
    it("should error on false", () => {
        expect(() => nul().parse(false)).toThrow();
    });

    it("should error on number", () => {
        expect(() => nul().parse(1)).toThrow();
    })

    it("should error on string", () => {
        expect(() => nul().parse("")).toThrow();
    })

    it("should error on object", () => {
        expect(() => nul().parse({})).toThrow();
    })

    it("should error on array", () => {
        expect(() => nul().parse([])).toThrow();
    })

    it("should parse null", () => {
        expect(nul().parse(null)).toBe(null);
    })

    it("should error on undefined", () => {
        expect(() => nul().parse(undefined)).toThrow();
    })

    it("should error on NaN", () => {
        expect(() => nul().parse(NaN)).toThrow();
    })

    it("should error on Infinity", () => {
        expect(() => nul().parse(Infinity)).toThrow();
    })

    it("should error on -Infinity", () => {
        expect(() => nul().parse(-Infinity)).toThrow();
    })

    it("should error on function", () => {
        expect(() => nul().parse(() => {})).toThrow();
    })

    it("should error on symbol", () => {
        expect(() => nul().parse(Symbol())).toThrow();
    })

    it("should error on Date", () => {
        expect(() => nul().parse(new Date())).toThrow();
    })

    it("should error on BigInt", () => {
        expect(() => nul().parse(BigInt(1))).toThrow();
    })

    it("should error on Map", () => {
        expect(() => nul().parse(new Map())).toThrow();
    })

    it("should error on Set", () => {
        expect(() => nul().parse(new Set())).toThrow();
    })

    it("should error on WeakMap", () => {
        expect(() => nul().parse(new WeakMap())).toThrow();
    })

    it("should error on WeakSet", () => {
        expect(() => nul().parse(new WeakSet())).toThrow();
    })

    it("should error on ArrayBuffer", () => {
        expect(() => nul().parse(new ArrayBuffer(1))).toThrow();
    })

    it("should error on Int8Array", () => {
        expect(() => nul().parse(new Int8Array(1))).toThrow();
    })

    it("should error on Uint8Array", () => {
        expect(() => nul().parse(new Uint8Array(1))).toThrow();
    })

    it("should error on Uint8ClampedArray", () => {
        expect(() => nul().parse(new Uint8ClampedArray(1))).toThrow();
    })

    it("should error on Int16Array", () => {
        expect(() => nul().parse(new Int16Array(1))).toThrow();
    })

    it("should error on Uint16Array", () => {
        expect(() => nul().parse(new Uint16Array(1))).toThrow();
    })

    it("should error on Int32Array", () => {
        expect(() => nul().parse(new Int32Array(1))).toThrow();
    })

    it("should error on Uint32Array", () => {
        expect(() => nul().parse(new Uint32Array(1))).toThrow();
    })

    it("should error on Float32Array", () => {
        expect(() => nul().parse(new Float32Array(1))).toThrow();
    })

    it("should error on Float64Array", () => {
        expect(() => nul().parse(new Float64Array(1))).toThrow();
    })

    it("should error on BigInt64Array", () => {
        expect(() => nul().parse(new BigInt64Array(1))).toThrow();
    })

    it("should error on BigUint64Array", () => {
        expect(() => nul().parse(new BigUint64Array(1))).toThrow();
    })

    it("should error on native enum variant", () => {
        expect(() => nul().parse(Foo.A)).toThrow();
        expect(() => nul().parse(Foo.B)).toThrow();
        expect(() => nul().parse(Foo.C)).toThrow();
        expect(() => nul().parse(Foo.D)).toThrow();
    })

    it("should error on instance", () => {
        expect(() => nul().parse(new Bar())).toThrow();
        expect(() => nul().parse(new Baz())).toThrow();
    })
});