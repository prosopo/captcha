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
        expectTypeOf(() => p().validate(null)).returns.toMatchTypeOf<Set<string>>();
        const parser = p();
        const a: Set<string> = new Set();
        const b: ReturnType<typeof parser.validate> = a;
    })

    it("should error on true", () => {
        expect(() => p().validate(true)).toThrow();
    });
    
    it("should error on false", () => {
        expect(() => p().validate(false)).toThrow();
    });

    it("should error on number", () => {
        expect(() => p().validate(1)).toThrow();
    })

    it("should error on string", () => {
        expect(() => p().validate("")).toThrow();
    })

    it("should error on object", () => {
        expect(() => p().validate({})).toThrow();
    })

    it("should error on array", () => {
        expect(() => p().validate([])).toThrow();
    })

    it("should error on null", () => {
        expect(() => p().validate(null)).toThrow();
    })

    it("should error on undefined", () => {
        expect(() => p().validate(undefined)).toThrow();
    })

    it("should error on NaN", () => {
        expect(() => p().validate(NaN)).toThrow();
    })

    it("should error on Infinity", () => {
        expect(() => p().validate(Infinity)).toThrow();
    })

    it("should error on -Infinity", () => {
        expect(() => p().validate(-Infinity)).toThrow();
    })

    it("should error on function", () => {
        expect(() => p().validate(() => {})).toThrow();
    })

    it("should error on symbol", () => {
        expect(() => p().validate(Symbol())).toThrow();
    })

    it("should error on Date", () => {
        expect(() => p().validate(new Date())).toThrow();
    })

    it("should error on BigInt", () => {
        expect(() => p().validate(BigInt(1))).toThrow();
    })

    it("should error on Map", () => {
        expect(() => p().validate(new Map())).toThrow();
    })

    it("should parse Set", () => {
        expect(p().validate(new Set())).toStrictEqual(new Set());
    })

    it("should parse populated Set", () => {
        expect(p().validate(new Set(["a", "b", "c"]))).toStrictEqual(new Set(["a", "b", "c"]));
    })

    it("should error on Set with invalid element type", () => {
        expect(() => p().validate(new Set([1, "b", "c"]))).toThrow();
    })

    it("should error on WeakMap", () => {
        expect(() => p().validate(new WeakMap())).toThrow();
    })

    it("should error on WeakSet", () => {
        expect(() => p().validate(new WeakSet())).toThrow();
    })

    it("should error on ArrayBuffer", () => {
        expect(() => p().validate(new ArrayBuffer(1))).toThrow();
    })

    it("should error on Int8Array", () => {
        expect(() => p().validate(new Int8Array(1))).toThrow();
    })

    it("should error on Uint8Array", () => {
        expect(() => p().validate(new Uint8Array(1))).toThrow();
    })

    it("should error on Uint8ClampedArray", () => {
        expect(() => p().validate(new Uint8ClampedArray(1))).toThrow();
    })

    it("should error on Int16Array", () => {
        expect(() => p().validate(new Int16Array(1))).toThrow();
    })

    it("should error on Uint16Array", () => {
        expect(() => p().validate(new Uint16Array(1))).toThrow();
    })

    it("should error on Int32Array", () => {
        expect(() => p().validate(new Int32Array(1))).toThrow();
    })

    it("should error on Uint32Array", () => {
        expect(() => p().validate(new Uint32Array(1))).toThrow();
    })

    it("should error on Float32Array", () => {
        expect(() => p().validate(new Float32Array(1))).toThrow();
    })

    it("should error on Float64Array", () => {
        expect(() => p().validate(new Float64Array(1))).toThrow();
    })

    it("should error on BigInt64Array", () => {
        expect(() => p().validate(new BigInt64Array(1))).toThrow();
    })

    it("should error on BigUint64Array", () => {
        expect(() => p().validate(new BigUint64Array(1))).toThrow();
    })

    it("should error on native enum variant", () => {
        expect(() => p().validate(Foo.A)).toThrow();
        expect(() => p().validate(Foo.B)).toThrow();
        expect(() => p().validate(Foo.C)).toThrow();
        expect(() => p().validate(Foo.D)).toThrow();
    })

    it("should error on instance", () => {
        expect(() => p().validate(new Bar())).toThrow();
        expect(() => p().validate(new Baz())).toThrow();
    })

    it("should error on regex", () => {
        expect(() => p().validate(/./)).toThrow();
    })
});