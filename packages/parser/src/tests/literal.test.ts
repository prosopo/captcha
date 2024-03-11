import { describe, expect, test, it, expectTypeOf } from 'vitest'
import { undef } from '../parsers/UndefinedParser.js';
import { literal } from '../parsers/LiteralParser.js';

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

describe("literal", () => {
    it("should parse to correct type", () => {
        expectTypeOf(() => literal('abc').parse(null)).returns.toMatchTypeOf<'abc'>();
        const parser = literal('abc');
        const a: 'abc' = 'abc';
        const b: ReturnType<typeof parser.parse> = a;
    })

    it("should parse literal", () => {
        expect(literal('abc').parse('abc')).toBe('abc');
    })

    it("should error on different literal", () => {
        expect(() => literal('abc').parse('def' as const)).toThrow();
    })

    it("should error on true", () => {
        expect(() => literal('abc').parse(true)).toThrow();
    });
    
    it("should error on false", () => {
        expect(() => literal('abc').parse(false)).toThrow();
    });

    it("should error on number", () => {
        expect(() => literal('abc').parse(1)).toThrow();
    })

    it("should error on string", () => {
        expect(() => literal('abc').parse("")).toThrow();
    })

    it("should error on object", () => {
        expect(() => literal('abc').parse({})).toThrow();
    })

    it("should error on array", () => {
        expect(() => literal('abc').parse([])).toThrow();
    })

    it("should error on null", () => {
        expect(() => literal('abc').parse(null)).toThrow();
    })

    it("should error on undefined", () => {
        expect(() => literal('abc').parse(undefined)).toThrow();
    })

    it("should error on NaN", () => {
        expect(() => literal('abc').parse(NaN)).toThrow();
    })

    it("should error on Infinity", () => {
        expect(() => literal('abc').parse(Infinity)).toThrow();
    })

    it("should error on -Infinity", () => {
        expect(() => literal('abc').parse(-Infinity)).toThrow();
    })

    it("should error on function", () => {
        expect(() => literal('abc').parse(() => {})).toThrow();
    })

    it("should error on symbol", () => {
        expect(() => literal('abc').parse(Symbol())).toThrow();
    })

    it("should error on Date", () => {
        expect(() => literal('abc').parse(new Date())).toThrow();
    })

    it("should error on BigInt", () => {
        expect(() => literal('abc').parse(BigInt(1))).toThrow();
    })

    it("should error on Map", () => {
        expect(() => literal('abc').parse(new Map())).toThrow();
    })

    it("should error on Set", () => {
        expect(() => literal('abc').parse(new Set())).toThrow();
    })

    it("should error on WeakMap", () => {
        expect(() => literal('abc').parse(new WeakMap())).toThrow();
    })

    it("should error on WeakSet", () => {
        expect(() => literal('abc').parse(new WeakSet())).toThrow();
    })

    it("should error on ArrayBuffer", () => {
        expect(() => literal('abc').parse(new ArrayBuffer(1))).toThrow();
    })

    it("should error on Int8Array", () => {
        expect(() => literal('abc').parse(new Int8Array(1))).toThrow();
    })

    it("should error on Uint8Array", () => {
        expect(() => literal('abc').parse(new Uint8Array(1))).toThrow();
    })

    it("should error on Uint8ClampedArray", () => {
        expect(() => literal('abc').parse(new Uint8ClampedArray(1))).toThrow();
    })

    it("should error on Int16Array", () => {
        expect(() => literal('abc').parse(new Int16Array(1))).toThrow();
    })

    it("should error on Uint16Array", () => {
        expect(() => literal('abc').parse(new Uint16Array(1))).toThrow();
    })

    it("should error on Int32Array", () => {
        expect(() => literal('abc').parse(new Int32Array(1))).toThrow();
    })

    it("should error on Uint32Array", () => {
        expect(() => literal('abc').parse(new Uint32Array(1))).toThrow();
    })

    it("should error on Float32Array", () => {
        expect(() => literal('abc').parse(new Float32Array(1))).toThrow();
    })

    it("should error on Float64Array", () => {
        expect(() => literal('abc').parse(new Float64Array(1))).toThrow();
    })

    it("should error on BigInt64Array", () => {
        expect(() => literal('abc').parse(new BigInt64Array(1))).toThrow();
    })

    it("should error on BigUint64Array", () => {
        expect(() => literal('abc').parse(new BigUint64Array(1))).toThrow();
    })

    it("should error on native enum variant", () => {
        expect(() => literal('abc').parse(Foo.A)).toThrow();
        expect(() => literal('abc').parse(Foo.B)).toThrow();
        expect(() => literal('abc').parse(Foo.C)).toThrow();
        expect(() => literal('abc').parse(Foo.D)).toThrow();
    })

    it("should error on instance", () => {
        expect(() => literal('abc').parse(new Bar())).toThrow();
        expect(() => literal('abc').parse(new Baz())).toThrow();
    })

    it("should error on regex", () => {
        expect(() => literal('abc').parse(/abc/)).toThrow();
    })
});