import { describe, expect, test, it, expectTypeOf, assertType } from 'vitest'
import { bool } from '../parsers/BooleanParser.js';
import { num } from '../parsers/NumberParser.js';
import { str } from '../parsers/StringParser.js';
import { tup } from '../parsers/TupleParser.js';

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

describe("tuple", () => {
    it("should parse to correct type", () => {
        const parser = tup([str(), num(), bool()]);
        const a: [string, number, boolean] = ["", 1, true]
        const b: ReturnType<typeof parser.parse> = a;
        expectTypeOf(parser.parse).toEqualTypeOf<(value: unknown) => [string, number, boolean]>();
    })

    it("should error on true", () => {
        expect(() => tup([str(), num(), bool()]).parse(true)).toThrow();
    });
    
    it("should error on false", () => {
        expect(() => tup([str(), num(), bool()]).parse(false)).toThrow();
    });

    it("should error on number", () => {
        expect(() => tup([str(), num(), bool()]).parse(1)).toThrow();
    })

    it("should error on string", () => {
        expect(() => tup([str(), num(), bool()]).parse("")).toThrow();
    })

    it("should error on object", () => {
        expect(() => tup([str(), num(), bool()]).parse({})).toThrow();
    })

    it("should error on array", () => {
        expect(() => tup([str(), num(), bool()]).parse([])).toThrow();
    })
    
    it("should parse tuple", () => {
        expect(tup([str(), num(), bool()]).parse(["", 1, true])).toEqual(["", 1, true]);
    })

    it("should error on missing tuple elements", () => {
        expect(() => tup([str(), num(), bool()]).parse(["", 1])).toThrow();
    })

    it("should error on extra tuple elements", () => {
        expect(() => tup([str(), num(), bool()]).parse(["", 1, true, "extra"])).toThrow();
    })

    it("should error on incorrect type of tuple elements", () => {
        expect(() => tup([str(), num(), bool()]).parse([1, "", true])).toThrow();
    })

    it("should error on null", () => {
        expect(() => tup([str(), num(), bool()]).parse(null)).toThrow();
    })

    it("should error on undefined", () => {
        expect(() => tup([str(), num(), bool()]).parse(undefined)).toThrow();
    })

    it("should error on NaN", () => {
        expect(() => tup([str(), num(), bool()]).parse(NaN)).toThrow();
    })

    it("should error on Infinity", () => {
        expect(() => tup([str(), num(), bool()]).parse(Infinity)).toThrow();
    })

    it("should error on -Infinity", () => {
        expect(() => tup([str(), num(), bool()]).parse(-Infinity)).toThrow();
    })

    it("should error on function", () => {
        expect(() => tup([str(), num(), bool()]).parse(() => {})).toThrow();
    })

    it("should error on symbol", () => {
        expect(() => tup([str(), num(), bool()]).parse(Symbol())).toThrow();
    })

    it("should error on Date", () => {
        expect(() => tup([str(), num(), bool()]).parse(new Date())).toThrow();
    })

    it("should error on BigInt", () => {
        expect(() => tup([str(), num(), bool()]).parse(BigInt(1))).toThrow();
    })

    it("should error on Map", () => {
        expect(() => tup([str(), num(), bool()]).parse(new Map())).toThrow();
    })

    it("should error on Set", () => {
        expect(() => tup([str(), num(), bool()]).parse(new Set())).toThrow();
    })

    it("should error on WeakMap", () => {
        expect(() => tup([str(), num(), bool()]).parse(new WeakMap())).toThrow();
    })

    it("should error on WeakSet", () => {
        expect(() => tup([str(), num(), bool()]).parse(new WeakSet())).toThrow();
    })

    it("should error on ArrayBuffer", () => {
        expect(() => tup([str(), num(), bool()]).parse(new ArrayBuffer(1))).toThrow();
    })

    it("should error on Int8Array", () => {
        expect(() => tup([str(), num(), bool()]).parse(new Int8Array(1))).toThrow();
    })

    it("should error on Uint8Array", () => {
        expect(() => tup([str(), num(), bool()]).parse(new Uint8Array(1))).toThrow();
    })

    it("should error on Uint8ClampedArray", () => {
        expect(() => tup([str(), num(), bool()]).parse(new Uint8ClampedArray(1))).toThrow();
    })

    it("should error on Int16Array", () => {
        expect(() => tup([str(), num(), bool()]).parse(new Int16Array(1))).toThrow();
    })

    it("should error on Uint16Array", () => {
        expect(() => tup([str(), num(), bool()]).parse(new Uint16Array(1))).toThrow();
    })

    it("should error on Int32Array", () => {
        expect(() => tup([str(), num(), bool()]).parse(new Int32Array(1))).toThrow();
    })

    it("should error on Uint32Array", () => {
        expect(() => tup([str(), num(), bool()]).parse(new Uint32Array(1))).toThrow();
    })

    it("should error on Float32Array", () => {
        expect(() => tup([str(), num(), bool()]).parse(new Float32Array(1))).toThrow();
    })

    it("should error on Float64Array", () => {
        expect(() => tup([str(), num(), bool()]).parse(new Float64Array(1))).toThrow();
    })

    it("should error on BigInt64Array", () => {
        expect(() => tup([str(), num(), bool()]).parse(new BigInt64Array(1))).toThrow();
    })

    it("should error on BigUint64Array", () => {
        expect(() => tup([str(), num(), bool()]).parse(new BigUint64Array(1))).toThrow();
    })

    it("should error on native enum variant", () => {
        expect(() => tup([str(), num(), bool()]).parse(Foo.A)).toThrow();
        expect(() => tup([str(), num(), bool()]).parse(Foo.B)).toThrow();
        expect(() => tup([str(), num(), bool()]).parse(Foo.C)).toThrow();
        expect(() => tup([str(), num(), bool()]).parse(Foo.D)).toThrow();
    })

    it("should error on instance", () => {
        expect(() => tup([str(), num(), bool()]).parse(new Bar())).toThrow();
        expect(() => tup([str(), num(), bool()]).parse(new Baz())).toThrow();
    })
});