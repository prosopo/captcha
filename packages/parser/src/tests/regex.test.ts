import { describe, expect, test, it, expectTypeOf } from 'vitest'
import { undef } from '../parsers/UndefinedParser.js';
import { regex } from '../parsers/RegexParser.js';

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

describe("regex", () => {
    it("should parse to correct type", () => {
        expectTypeOf(() => regex().parse(null)).returns.toMatchTypeOf<RegExp>();
        const parser = regex();
        const a: RegExp = /./
        const b: ReturnType<typeof parser.parse> = a
    })

    it("should error on true", () => {
        expect(() => regex().parse(true)).toThrow();
    });
    
    it("should error on false", () => {
        expect(() => regex().parse(false)).toThrow();
    });

    it("should error on number", () => {
        expect(() => regex().parse(1)).toThrow();
    })

    it("should error on string", () => {
        expect(() => regex().parse("")).toThrow();
    })

    it("should error on object", () => {
        expect(() => regex().parse({})).toThrow();
    })

    it("should error on array", () => {
        expect(() => regex().parse([])).toThrow();
    })

    it("should error on null", () => {
        expect(() => regex().parse(null)).toThrow();
    })

    it("should error on undefined", () => {
        expect(() => regex().parse(undefined)).toThrow();
    })

    it("should error on NaN", () => {
        expect(() => regex().parse(NaN)).toThrow();
    })

    it("should error on Infinity", () => {
        expect(() => regex().parse(Infinity)).toThrow();
    })

    it("should error on -Infinity", () => {
        expect(() => regex().parse(-Infinity)).toThrow();
    })

    it("should error on function", () => {
        expect(() => regex().parse(() => {})).toThrow();
    })

    it("should error on symbol", () => {
        expect(() => regex().parse(Symbol())).toThrow();
    })

    it("should error on Date", () => {
        expect(() => regex().parse(new Date())).toThrow();
    })

    it("should error on BigInt", () => {
        expect(() => regex().parse(BigInt(1))).toThrow();
    })

    it("should error on Map", () => {
        expect(() => regex().parse(new Map())).toThrow();
    })

    it("should error on Set", () => {
        expect(() => regex().parse(new Set())).toThrow();
    })

    it("should error on WeakMap", () => {
        expect(() => regex().parse(new WeakMap())).toThrow();
    })

    it("should error on WeakSet", () => {
        expect(() => regex().parse(new WeakSet())).toThrow();
    })

    it("should error on ArrayBuffer", () => {
        expect(() => regex().parse(new ArrayBuffer(1))).toThrow();
    })

    it("should error on Int8Array", () => {
        expect(() => regex().parse(new Int8Array(1))).toThrow();
    })

    it("should error on Uint8Array", () => {
        expect(() => regex().parse(new Uint8Array(1))).toThrow();
    })

    it("should error on Uint8ClampedArray", () => {
        expect(() => regex().parse(new Uint8ClampedArray(1))).toThrow();
    })

    it("should error on Int16Array", () => {
        expect(() => regex().parse(new Int16Array(1))).toThrow();
    })

    it("should error on Uint16Array", () => {
        expect(() => regex().parse(new Uint16Array(1))).toThrow();
    })

    it("should error on Int32Array", () => {
        expect(() => regex().parse(new Int32Array(1))).toThrow();
    })

    it("should error on Uint32Array", () => {
        expect(() => regex().parse(new Uint32Array(1))).toThrow();
    })

    it("should error on Float32Array", () => {
        expect(() => regex().parse(new Float32Array(1))).toThrow();
    })

    it("should error on Float64Array", () => {
        expect(() => regex().parse(new Float64Array(1))).toThrow();
    })

    it("should error on BigInt64Array", () => {
        expect(() => regex().parse(new BigInt64Array(1))).toThrow();
    })

    it("should error on BigUint64Array", () => {
        expect(() => regex().parse(new BigUint64Array(1))).toThrow();
    })

    it("should error on native enum variant", () => {
        expect(() => regex().parse(Foo.A)).toThrow();
        expect(() => regex().parse(Foo.B)).toThrow();
        expect(() => regex().parse(Foo.C)).toThrow();
        expect(() => regex().parse(Foo.D)).toThrow();
    })

    it("should error on instance", () => {
        expect(() => regex().parse(new Bar())).toThrow();
        expect(() => regex().parse(new Baz())).toThrow();
    })

    it("should parse regex", () => {
        expect(regex().parse(/./)).toEqual(/./);
    })
});