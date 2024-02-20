import { describe, expect, test, it, expectTypeOf } from 'vitest'
import { arr } from '../parsers/ArrayParser.js';
import { str } from '../parsers/StringParser.js';

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

describe("array", () => {
    it("should parse to correct type", () => {
        expectTypeOf(() => arr(str()).parse(null)).returns.toMatchTypeOf<string[]>();
        const parser = arr(str());
        const a: string[] = [];
        const b: ReturnType<typeof parser.parse> = a;
    })

    it("should error on true", () => {
        expect(() => arr(str()).parse(true)).toThrow();
    });
    
    it("should error on false", () => {
        expect(() => arr(str()).parse(false)).toThrow();
    });

    it("should error on number", () => {
        expect(() => arr(str()).parse(1)).toThrow();
    })

    it("should error on string", () => {
        expect(() => arr(str()).parse("")).toThrow();
    })

    it("should error on object", () => {
        expect(() => arr(str()).parse({})).toThrow();
    })

    it("should parse array", () => {
        expect(arr(str()).parse([])).toStrictEqual([]);
    })

    it("should parse populated array", () => {
        expect(arr(str()).parse(["a", "b", "c"])).toStrictEqual(["a", "b", "c"]);
    })

    it("should error on null", () => {
        expect(() => arr(str()).parse(null)).toThrow();
    })

    it("should error on undefined", () => {
        expect(() => arr(str()).parse(undefined)).toThrow();
    })

    it("should error on NaN", () => {
        expect(() => arr(str()).parse(NaN)).toThrow();
    })

    it("should error on Infinity", () => {
        expect(() => arr(str()).parse(Infinity)).toThrow();
    })

    it("should error on -Infinity", () => {
        expect(() => arr(str()).parse(-Infinity)).toThrow();
    })

    it("should error on function", () => {
        expect(() => arr(str()).parse(() => {})).toThrow();
    })

    it("should error on symbol", () => {
        expect(() => arr(str()).parse(Symbol())).toThrow();
    })

    it("should error on Date", () => {
        expect(() => arr(str()).parse(new Date())).toThrow();
    })

    it("should error on BigInt", () => {
        expect(() => arr(str()).parse(BigInt(1))).toThrow();
    })

    it("should error on Map", () => {
        expect(() => arr(str()).parse(new Map())).toThrow();
    })

    it("should error on Set", () => {
        expect(() => arr(str()).parse(new Set())).toThrow();
    })

    it("should error on WeakMap", () => {
        expect(() => arr(str()).parse(new WeakMap())).toThrow();
    })

    it("should error on WeakSet", () => {
        expect(() => arr(str()).parse(new WeakSet())).toThrow();
    })

    it("should error on ArrayBuffer", () => {
        expect(() => arr(str()).parse(new ArrayBuffer(1))).toThrow();
    })

    it("should error on Int8Array", () => {
        expect(() => arr(str()).parse(new Int8Array(1))).toThrow();
    })

    it("should error on Uint8Array", () => {
        expect(() => arr(str()).parse(new Uint8Array(1))).toThrow();
    })

    it("should error on Uint8ClampedArray", () => {
        expect(() => arr(str()).parse(new Uint8ClampedArray(1))).toThrow();
    })

    it("should error on Int16Array", () => {
        expect(() => arr(str()).parse(new Int16Array(1))).toThrow();
    })

    it("should error on Uint16Array", () => {
        expect(() => arr(str()).parse(new Uint16Array(1))).toThrow();
    })

    it("should error on Int32Array", () => {
        expect(() => arr(str()).parse(new Int32Array(1))).toThrow();
    })

    it("should error on Uint32Array", () => {
        expect(() => arr(str()).parse(new Uint32Array(1))).toThrow();
    })

    it("should error on Float32Array", () => {
        expect(() => arr(str()).parse(new Float32Array(1))).toThrow();
    })

    it("should error on Float64Array", () => {
        expect(() => arr(str()).parse(new Float64Array(1))).toThrow();
    })

    it("should error on BigInt64Array", () => {
        expect(() => arr(str()).parse(new BigInt64Array(1))).toThrow();
    })

    it("should error on BigUint64Array", () => {
        expect(() => arr(str()).parse(new BigUint64Array(1))).toThrow();
    })

    it("should error on native enum variant", () => {
        expect(() => arr(str()).parse(Foo.A)).toThrow();
        expect(() => arr(str()).parse(Foo.B)).toThrow();
        expect(() => arr(str()).parse(Foo.C)).toThrow();
        expect(() => arr(str()).parse(Foo.D)).toThrow();
    })

    it("should error on instance", () => {
        expect(() => arr(str()).parse(new Bar())).toThrow();
        expect(() => arr(str()).parse(new Baz())).toThrow();
    })
});