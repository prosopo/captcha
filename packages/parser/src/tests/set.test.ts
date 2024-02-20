import { describe, expect, test, it, expectTypeOf } from 'vitest'
import { undef } from '../parsers/UndefinedParser.js';
import { num } from '../parsers/NumberParser.js';
import { str } from '../parsers/StringParser.js';
import { map } from '../parsers/MapParser.js';
import { set } from '../parsers/SetParser.js';

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

describe("set", () => {
    it("should parse to correct type", () => {
        expectTypeOf(() => set(str()).parse(null)).returns.toMatchTypeOf<Set<string>>();
    })

    it("should error on true", () => {
        expect(() => set(str()).parse(true)).toThrow();
    });
    
    it("should error on false", () => {
        expect(() => set(str()).parse(false)).toThrow();
    });

    it("should error on number", () => {
        expect(() => set(str()).parse(1)).toThrow();
    })

    it("should error on string", () => {
        expect(() => set(str()).parse("")).toThrow();
    })

    it("should error on object", () => {
        expect(() => set(str()).parse({})).toThrow();
    })

    it("should error on array", () => {
        expect(() => set(str()).parse([])).toThrow();
    })

    it("should error on null", () => {
        expect(() => set(str()).parse(null)).toThrow();
    })

    it("should error on undefined", () => {
        expect(() => set(str()).parse(undefined)).toThrow();
    })

    it("should error on NaN", () => {
        expect(() => set(str()).parse(NaN)).toThrow();
    })

    it("should error on Infinity", () => {
        expect(() => set(str()).parse(Infinity)).toThrow();
    })

    it("should error on -Infinity", () => {
        expect(() => set(str()).parse(-Infinity)).toThrow();
    })

    it("should error on function", () => {
        expect(() => set(str()).parse(() => {})).toThrow();
    })

    it("should error on symbol", () => {
        expect(() => set(str()).parse(Symbol())).toThrow();
    })

    it("should error on Date", () => {
        expect(() => set(str()).parse(new Date())).toThrow();
    })

    it("should error on BigInt", () => {
        expect(() => set(str()).parse(BigInt(1))).toThrow();
    })

    it("should error on Map", () => {
        expect(() => set(str()).parse(new Map())).toThrow();
    })

    it("should parse Set", () => {
        expect(set(str()).parse(new Set())).toStrictEqual(new Set());
    })

    it("should parse populated Set", () => {
        expect(set(str()).parse(new Set(["a", "b", "c"]))).toStrictEqual(new Set(["a", "b", "c"]));
    })

    it("should error on Set with invalid element type", () => {
        expect(() => set(str()).parse(new Set([1, "b", "c"]))).toThrow();
    })

    it("should error on WeakMap", () => {
        expect(() => set(str()).parse(new WeakMap())).toThrow();
    })

    it("should error on WeakSet", () => {
        expect(() => set(str()).parse(new WeakSet())).toThrow();
    })

    it("should error on ArrayBuffer", () => {
        expect(() => set(str()).parse(new ArrayBuffer(1))).toThrow();
    })

    it("should error on Int8Array", () => {
        expect(() => set(str()).parse(new Int8Array(1))).toThrow();
    })

    it("should error on Uint8Array", () => {
        expect(() => set(str()).parse(new Uint8Array(1))).toThrow();
    })

    it("should error on Uint8ClampedArray", () => {
        expect(() => set(str()).parse(new Uint8ClampedArray(1))).toThrow();
    })

    it("should error on Int16Array", () => {
        expect(() => set(str()).parse(new Int16Array(1))).toThrow();
    })

    it("should error on Uint16Array", () => {
        expect(() => set(str()).parse(new Uint16Array(1))).toThrow();
    })

    it("should error on Int32Array", () => {
        expect(() => set(str()).parse(new Int32Array(1))).toThrow();
    })

    it("should error on Uint32Array", () => {
        expect(() => set(str()).parse(new Uint32Array(1))).toThrow();
    })

    it("should error on Float32Array", () => {
        expect(() => set(str()).parse(new Float32Array(1))).toThrow();
    })

    it("should error on Float64Array", () => {
        expect(() => set(str()).parse(new Float64Array(1))).toThrow();
    })

    it("should error on BigInt64Array", () => {
        expect(() => set(str()).parse(new BigInt64Array(1))).toThrow();
    })

    it("should error on BigUint64Array", () => {
        expect(() => set(str()).parse(new BigUint64Array(1))).toThrow();
    })

    it("should error on native enum variant", () => {
        expect(() => set(str()).parse(Foo.A)).toThrow();
        expect(() => set(str()).parse(Foo.B)).toThrow();
        expect(() => set(str()).parse(Foo.C)).toThrow();
        expect(() => set(str()).parse(Foo.D)).toThrow();
    })

    it("should error on instance", () => {
        expect(() => set(str()).parse(new Bar())).toThrow();
        expect(() => set(str()).parse(new Baz())).toThrow();
    })
});