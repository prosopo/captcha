import { describe, expect, test, it, expectTypeOf } from 'vitest'
import { sym } from '../parsers/SymbolParser.js';

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

describe("sym", () => {
    it("should parse to correct type", () => {
        expectTypeOf(() => sym().parse(null)).returns.toMatchTypeOf<Symbol>();
        const parser = sym();
        const a: symbol = Symbol();
        const b: ReturnType<typeof parser.parse> = a;
    })

    it("should error on true", () => {
        expect(() => sym().parse(true)).toThrow();
    });
    
    it("should error on false", () => {
        expect(() => sym().parse(false)).toThrow();
    });

    it("should error on number", () => {
        expect(() => sym().parse(1)).toThrow();
    })

    it("should error on string", () => {
        expect(() => sym().parse("")).toThrow();
    })

    it("should error on object", () => {
        expect(() => sym().parse({})).toThrow();
    })

    it("should error on array", () => {
        expect(() => sym().parse([])).toThrow();
    })

    it("should error on null", () => {
        expect(() => sym().parse(null)).toThrow();
    })

    it("should error on undefined", () => {
        expect(() => sym().parse(undefined)).toThrow();
    })

    it("should error on NaN", () => {
        expect(() => sym().parse(NaN)).toThrow();
    })

    it("should error on Infinity", () => {
        expect(() => sym().parse(Infinity)).toThrow();
    })

    it("should error on -Infinity", () => {
        expect(() => sym().parse(-Infinity)).toThrow();
    })

    it("should error on function", () => {
        expect(() => sym().parse(() => {})).toThrow();
    })

    it("should parse symbol", () => {
        const s = Symbol();
        expect(sym().parse(s)).toBe(s);
    })

    it("should error on Date", () => {
        expect(() => sym().parse(new Date())).toThrow();
    })

    it("should error on BigInt", () => {
        expect(() => sym().parse(BigInt(1))).toThrow();
    })

    it("should error on Map", () => {
        expect(() => sym().parse(new Map())).toThrow();
    })

    it("should error on Set", () => {
        expect(() => sym().parse(new Set())).toThrow();
    })

    it("should error on WeakMap", () => {
        expect(() => sym().parse(new WeakMap())).toThrow();
    })

    it("should error on WeakSet", () => {
        expect(() => sym().parse(new WeakSet())).toThrow();
    })

    it("should error on ArrayBuffer", () => {
        expect(() => sym().parse(new ArrayBuffer(1))).toThrow();
    })

    it("should error on Int8Array", () => {
        expect(() => sym().parse(new Int8Array(1))).toThrow();
    })

    it("should error on Uint8Array", () => {
        expect(() => sym().parse(new Uint8Array(1))).toThrow();
    })

    it("should error on Uint8ClampedArray", () => {
        expect(() => sym().parse(new Uint8ClampedArray(1))).toThrow();
    })

    it("should error on Int16Array", () => {
        expect(() => sym().parse(new Int16Array(1))).toThrow();
    })

    it("should error on Uint16Array", () => {
        expect(() => sym().parse(new Uint16Array(1))).toThrow();
    })

    it("should error on Int32Array", () => {
        expect(() => sym().parse(new Int32Array(1))).toThrow();
    })

    it("should error on Uint32Array", () => {
        expect(() => sym().parse(new Uint32Array(1))).toThrow();
    })

    it("should error on Float32Array", () => {
        expect(() => sym().parse(new Float32Array(1))).toThrow();
    })

    it("should error on Float64Array", () => {
        expect(() => sym().parse(new Float64Array(1))).toThrow();
    })

    it("should error on BigInt64Array", () => {
        expect(() => sym().parse(new BigInt64Array(1))).toThrow();
    })

    it("should error on BigUint64Array", () => {
        expect(() => sym().parse(new BigUint64Array(1))).toThrow();
    })

    it("should error on native enum variant", () => {
        expect(() => sym().parse(Foo.A)).toThrow();
        expect(() => sym().parse(Foo.B)).toThrow();
        expect(() => sym().parse(Foo.C)).toThrow();
        expect(() => sym().parse(Foo.D)).toThrow();
    })

    it("should error on instance", () => {
        expect(() => sym().parse(new Bar())).toThrow();
        expect(() => sym().parse(new Baz())).toThrow();
    })

    it("should error on regex", () => {
        expect(() => sym().parse(/./)).toThrow();
    })
});