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

const p = () => set(str());

describe("set", () => {
    it("should have correct typename", () => {
        expect(p().name).toBe(`Set<${str().name}>`)
    })
    
    it("should parse to correct type", () => {
        expectTypeOf(() => p().shape(null)).returns.toMatchTypeOf<Set<string>>();
        const parser = p();
        const a: Set<string> = new Set();
        const b: ReturnType<typeof parser.shape> = a;
    })

    it("should error on true", () => {
        expect(() => p().shape(true)).toThrow();
    });
    
    it("should error on false", () => {
        expect(() => p().shape(false)).toThrow();
    });

    it("should error on number", () => {
        expect(() => p().shape(1)).toThrow();
    })

    it("should error on string", () => {
        expect(() => p().shape("")).toThrow();
    })

    it("should error on object", () => {
        expect(() => p().shape({})).toThrow();
    })

    it("should error on array", () => {
        expect(() => p().shape([])).toThrow();
    })

    it("should error on null", () => {
        expect(() => p().shape(null)).toThrow();
    })

    it("should error on undefined", () => {
        expect(() => p().shape(undefined)).toThrow();
    })

    it("should error on NaN", () => {
        expect(() => p().shape(NaN)).toThrow();
    })

    it("should error on Infinity", () => {
        expect(() => p().shape(Infinity)).toThrow();
    })

    it("should error on -Infinity", () => {
        expect(() => p().shape(-Infinity)).toThrow();
    })

    it("should error on function", () => {
        expect(() => p().shape(() => {})).toThrow();
    })

    it("should error on symbol", () => {
        expect(() => p().shape(Symbol())).toThrow();
    })

    it("should error on Date", () => {
        expect(() => p().shape(new Date())).toThrow();
    })

    it("should error on BigInt", () => {
        expect(() => p().shape(BigInt(1))).toThrow();
    })

    it("should error on Map", () => {
        expect(() => p().shape(new Map())).toThrow();
    })

    it("should parse Set", () => {
        expect(p().shape(new Set())).toStrictEqual(new Set());
    })

    it("should parse populated Set", () => {
        expect(p().shape(new Set(["a", "b", "c"]))).toStrictEqual(new Set(["a", "b", "c"]));
    })

    it("should error on Set with invalid element type", () => {
        expect(() => p().shape(new Set([1, "b", "c"]))).toThrow();
    })

    it("should error on WeakMap", () => {
        expect(() => p().shape(new WeakMap())).toThrow();
    })

    it("should error on WeakSet", () => {
        expect(() => p().shape(new WeakSet())).toThrow();
    })

    it("should error on ArrayBuffer", () => {
        expect(() => p().shape(new ArrayBuffer(1))).toThrow();
    })

    it("should error on Int8Array", () => {
        expect(() => p().shape(new Int8Array(1))).toThrow();
    })

    it("should error on Uint8Array", () => {
        expect(() => p().shape(new Uint8Array(1))).toThrow();
    })

    it("should error on Uint8ClampedArray", () => {
        expect(() => p().shape(new Uint8ClampedArray(1))).toThrow();
    })

    it("should error on Int16Array", () => {
        expect(() => p().shape(new Int16Array(1))).toThrow();
    })

    it("should error on Uint16Array", () => {
        expect(() => p().shape(new Uint16Array(1))).toThrow();
    })

    it("should error on Int32Array", () => {
        expect(() => p().shape(new Int32Array(1))).toThrow();
    })

    it("should error on Uint32Array", () => {
        expect(() => p().shape(new Uint32Array(1))).toThrow();
    })

    it("should error on Float32Array", () => {
        expect(() => p().shape(new Float32Array(1))).toThrow();
    })

    it("should error on Float64Array", () => {
        expect(() => p().shape(new Float64Array(1))).toThrow();
    })

    it("should error on BigInt64Array", () => {
        expect(() => p().shape(new BigInt64Array(1))).toThrow();
    })

    it("should error on BigUint64Array", () => {
        expect(() => p().shape(new BigUint64Array(1))).toThrow();
    })

    it("should error on native enum variant", () => {
        expect(() => p().shape(Foo.A)).toThrow();
        expect(() => p().shape(Foo.B)).toThrow();
        expect(() => p().shape(Foo.C)).toThrow();
        expect(() => p().shape(Foo.D)).toThrow();
    })

    it("should error on instance", () => {
        expect(() => p().shape(new Bar())).toThrow();
        expect(() => p().shape(new Baz())).toThrow();
    })

    it("should error on regex", () => {
        expect(() => p().shape(/./)).toThrow();
    })
});