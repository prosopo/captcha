import { describe, expect, test, it, expectTypeOf } from 'vitest'
import { undef } from '../parsers/UndefinedParser.js';
import { num } from '../parsers/NumberParser.js';
import { str } from '../parsers/StringParser.js';
import { map } from '../parsers/MapParser.js';

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

describe("map", () => {
    it("should parse to correct type", () => {
        expectTypeOf(() => map(str(), num()).parse(null)).returns.toMatchTypeOf<Map<string, number>>();
    })

    it("should error on true", () => {
        expect(() => map(str(), num()).parse(true)).toThrow();
    });
    
    it("should error on false", () => {
        expect(() => map(str(), num()).parse(false)).toThrow();
    });

    it("should error on number", () => {
        expect(() => map(str(), num()).parse(1)).toThrow();
    })

    it("should error on string", () => {
        expect(() => map(str(), num()).parse("")).toThrow();
    })

    it("should error on object", () => {
        expect(() => map(str(), num()).parse({})).toThrow();
    })

    it("should error on array", () => {
        expect(() => map(str(), num()).parse([])).toThrow();
    })

    it("should error on null", () => {
        expect(() => map(str(), num()).parse(null)).toThrow();
    })

    it("should error on undefined", () => {
        expect(() => map(str(), num()).parse(undefined)).toThrow();
    })

    it("should error on NaN", () => {
        expect(() => map(str(), num()).parse(NaN)).toThrow();
    })

    it("should error on Infinity", () => {
        expect(() => map(str(), num()).parse(Infinity)).toThrow();
    })

    it("should error on -Infinity", () => {
        expect(() => map(str(), num()).parse(-Infinity)).toThrow();
    })

    it("should error on function", () => {
        expect(() => map(str(), num()).parse(() => {})).toThrow();
    })

    it("should error on symbol", () => {
        expect(() => map(str(), num()).parse(Symbol())).toThrow();
    })

    it("should error on Date", () => {
        expect(() => map(str(), num()).parse(new Date())).toThrow();
    })

    it("should error on BigInt", () => {
        expect(() => map(str(), num()).parse(BigInt(1))).toThrow();
    })

    it("should parse populated Map", () => {
        expect(map(str(), num()).parse(new Map([["a", 1], ["b", 2], ["c", 3]]))).toStrictEqual(new Map([["a", 1], ["b", 2], ["c", 3]]));
    })

    it("should error on Map with invalid key type", () => {
        expect(() => map(str(), num()).parse(new Map<string | number, number>([[1, 1], ["b", 2], ["c", 3]]) as any)).toThrow();
    })

    it("should error on Map with invalid value type", () => {
        expect(() => map(str(), num()).parse(new Map<string, string | number>([["a", "1"], ["b", 2], ["c", 3]]) as any)).toThrow();
    })

    it("should parse Map", () => {
        expect(map(str(), num()).parse(new Map())).toStrictEqual(new Map());
    })

    it("should error on Set", () => {
        expect(() => map(str(), num()).parse(new Set())).toThrow();
    })

    it("should error on WeakMap", () => {
        expect(() => map(str(), num()).parse(new WeakMap())).toThrow();
    })

    it("should error on WeakSet", () => {
        expect(() => map(str(), num()).parse(new WeakSet())).toThrow();
    })

    it("should error on ArrayBuffer", () => {
        expect(() => map(str(), num()).parse(new ArrayBuffer(1))).toThrow();
    })

    it("should error on Int8Array", () => {
        expect(() => map(str(), num()).parse(new Int8Array(1))).toThrow();
    })

    it("should error on Uint8Array", () => {
        expect(() => map(str(), num()).parse(new Uint8Array(1))).toThrow();
    })

    it("should error on Uint8ClampedArray", () => {
        expect(() => map(str(), num()).parse(new Uint8ClampedArray(1))).toThrow();
    })

    it("should error on Int16Array", () => {
        expect(() => map(str(), num()).parse(new Int16Array(1))).toThrow();
    })

    it("should error on Uint16Array", () => {
        expect(() => map(str(), num()).parse(new Uint16Array(1))).toThrow();
    })

    it("should error on Int32Array", () => {
        expect(() => map(str(), num()).parse(new Int32Array(1))).toThrow();
    })

    it("should error on Uint32Array", () => {
        expect(() => map(str(), num()).parse(new Uint32Array(1))).toThrow();
    })

    it("should error on Float32Array", () => {
        expect(() => map(str(), num()).parse(new Float32Array(1))).toThrow();
    })

    it("should error on Float64Array", () => {
        expect(() => map(str(), num()).parse(new Float64Array(1))).toThrow();
    })

    it("should error on BigInt64Array", () => {
        expect(() => map(str(), num()).parse(new BigInt64Array(1))).toThrow();
    })

    it("should error on BigUint64Array", () => {
        expect(() => map(str(), num()).parse(new BigUint64Array(1))).toThrow();
    })

    it("should error on native enum variant", () => {
        expect(() => map(str(), num()).parse(Foo.A)).toThrow();
        expect(() => map(str(), num()).parse(Foo.B)).toThrow();
        expect(() => map(str(), num()).parse(Foo.C)).toThrow();
        expect(() => map(str(), num()).parse(Foo.D)).toThrow();
    })

    it("should error on instance", () => {
        expect(() => map(str(), num()).parse(new Bar())).toThrow();
        expect(() => map(str(), num()).parse(new Baz())).toThrow();
    })
});