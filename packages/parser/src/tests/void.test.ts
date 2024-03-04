import { describe, expect, test, it, expectTypeOf } from 'vitest'
import { undef } from '../parsers/UndefinedParser.js';
import { voi } from '../parsers/VoidParser.js';

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

describe("void", () => {
    it("should parse to correct type", () => {
        expectTypeOf(() => voi().parse(null)).returns.toMatchTypeOf<void>();
        const parser = voi();
        const a: void = undefined
        const b: ReturnType<typeof parser.parse> = a
    })

    it("should error on true", () => {
        expect(() => voi().parse(true)).toThrow();
    });
    
    it("should error on false", () => {
        expect(() => voi().parse(false)).toThrow();
    });

    it("should error on number", () => {
        expect(() => voi().parse(1)).toThrow();
    })

    it("should error on string", () => {
        expect(() => voi().parse("")).toThrow();
    })

    it("should error on object", () => {
        expect(() => voi().parse({})).toThrow();
    })

    it("should error on array", () => {
        expect(() => voi().parse([])).toThrow();
    })

    it("should parse null", () => {
        expect(voi().parse(null)).toBe(undefined);
    })

    it("should parse undefined", () => {
        expect(voi().parse(undefined)).toBe(undefined);
    })

    it("should error on NaN", () => {
        expect(() => voi().parse(NaN)).toThrow();
    })

    it("should error on Infinity", () => {
        expect(() => voi().parse(Infinity)).toThrow();
    })

    it("should error on -Infinity", () => {
        expect(() => voi().parse(-Infinity)).toThrow();
    })

    it("should error on function", () => {
        expect(() => voi().parse(() => {})).toThrow();
    })

    it("should error on symbol", () => {
        expect(() => voi().parse(Symbol())).toThrow();
    })

    it("should error on Date", () => {
        expect(() => voi().parse(new Date())).toThrow();
    })

    it("should error on BigInt", () => {
        expect(() => voi().parse(BigInt(1))).toThrow();
    })

    it("should error on Map", () => {
        expect(() => voi().parse(new Map())).toThrow();
    })

    it("should error on Set", () => {
        expect(() => voi().parse(new Set())).toThrow();
    })

    it("should error on WeakMap", () => {
        expect(() => voi().parse(new WeakMap())).toThrow();
    })

    it("should error on WeakSet", () => {
        expect(() => voi().parse(new WeakSet())).toThrow();
    })

    it("should error on ArrayBuffer", () => {
        expect(() => voi().parse(new ArrayBuffer(1))).toThrow();
    })

    it("should error on Int8Array", () => {
        expect(() => voi().parse(new Int8Array(1))).toThrow();
    })

    it("should error on Uint8Array", () => {
        expect(() => voi().parse(new Uint8Array(1))).toThrow();
    })

    it("should error on Uint8ClampedArray", () => {
        expect(() => voi().parse(new Uint8ClampedArray(1))).toThrow();
    })

    it("should error on Int16Array", () => {
        expect(() => voi().parse(new Int16Array(1))).toThrow();
    })

    it("should error on Uint16Array", () => {
        expect(() => voi().parse(new Uint16Array(1))).toThrow();
    })

    it("should error on Int32Array", () => {
        expect(() => voi().parse(new Int32Array(1))).toThrow();
    })

    it("should error on Uint32Array", () => {
        expect(() => voi().parse(new Uint32Array(1))).toThrow();
    })

    it("should error on Float32Array", () => {
        expect(() => voi().parse(new Float32Array(1))).toThrow();
    })

    it("should error on Float64Array", () => {
        expect(() => voi().parse(new Float64Array(1))).toThrow();
    })

    it("should error on BigInt64Array", () => {
        expect(() => voi().parse(new BigInt64Array(1))).toThrow();
    })

    it("should error on BigUint64Array", () => {
        expect(() => voi().parse(new BigUint64Array(1))).toThrow();
    })

    it("should error on native enum variant", () => {
        expect(() => voi().parse(Foo.A)).toThrow();
        expect(() => voi().parse(Foo.B)).toThrow();
        expect(() => voi().parse(Foo.C)).toThrow();
        expect(() => voi().parse(Foo.D)).toThrow();
    })

    it("should error on instance", () => {
        expect(() => voi().parse(new Bar())).toThrow();
        expect(() => voi().parse(new Baz())).toThrow();
    })

    it("should error on regex", () => {
        expect(voi().parse(/./)).toEqual(/./);
    })
});