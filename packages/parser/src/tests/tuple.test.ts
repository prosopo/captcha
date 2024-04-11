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

const p = () => tup([str(), num(), bool()]);

describe("tuple", () => {
    it("should have correct typename", () => {
        expect(p().name).toBe(`[${str().name}, ${num().name}, ${bool().name}]`)
    })
    
    it("should parse to correct type", () => {
        const parser = p();
        const a: [string, number, boolean] = ["", 1, true]
        const b: ReturnType<typeof parser.validate> = a;
        expectTypeOf(parser.validate).toEqualTypeOf<(value: unknown) => [string, number, boolean]>();
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
    
    it("should parse tuple", () => {
        expect(p().validate(["", 1, true])).toEqual(["", 1, true]);
    })

    it("should error on missing tuple elements", () => {
        expect(() => p().validate(["", 1])).toThrow();
    })

    it("should error on extra tuple elements", () => {
        expect(() => p().validate(["", 1, true, "extra"])).toThrow();
    })

    it("should error on incorrect type of tuple elements", () => {
        expect(() => p().validate([1, "", true])).toThrow();
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

    it("should error on Set", () => {
        expect(() => p().validate(new Set())).toThrow();
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