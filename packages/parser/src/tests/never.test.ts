import { describe, expect, test, it, expectTypeOf } from 'vitest'
import { undef } from '../parsers/UndefinedParser.js';
import { never } from '../parsers/NeverParser.js';

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

describe("never", () => {
    it("should parse to correct type", () => {
        expectTypeOf(() => never().parse(null)).returns.toMatchTypeOf<never>();
        const parser = never();
        const a: never = undefined!
        const b: ReturnType<typeof parser.parse> = a
    })

    it("should error on true", () => {
        expect(() => never().parse(true)).toThrow();
    });
    
    it("should error on false", () => {
        expect(() => never().parse(false)).toThrow();
    });

    it("should error on number", () => {
        expect(() => never().parse(1)).toThrow();
    })

    it("should error on string", () => {
        expect(() => never().parse("")).toThrow();
    })

    it("should error on object", () => {
        expect(() => never().parse({})).toThrow();
    })

    it("should error on array", () => {
        expect(() => never().parse([])).toThrow();
    })

    it("should error on null", () => {
        expect(() => never().parse(null)).toThrow();
    })

    it("should error on undefined", () => {
        expect(() => never().parse(undefined)).toThrow();
    })

    it("should error on NaN", () => {
        expect(() => never().parse(NaN)).toThrow();
    })

    it("should error on Infinity", () => {
        expect(() => never().parse(Infinity)).toThrow();
    })

    it("should error on -Infinity", () => {
        expect(() => never().parse(-Infinity)).toThrow();
    })

    it("should error on function", () => {
        expect(() => never().parse(() => {})).toThrow();
    })

    it("should error on symbol", () => {
        expect(() => never().parse(Symbol())).toThrow();
    })

    it("should error on Date", () => {
        expect(() => never().parse(new Date())).toThrow();
    })

    it("should error on BigInt", () => {
        expect(() => never().parse(BigInt(1))).toThrow();
    })

    it("should error on Map", () => {
        expect(() => never().parse(new Map())).toThrow();
    })

    it("should error on Set", () => {
        expect(() => never().parse(new Set())).toThrow();
    })

    it("should error on WeakMap", () => {
        expect(() => never().parse(new WeakMap())).toThrow();
    })

    it("should error on WeakSet", () => {
        expect(() => never().parse(new WeakSet())).toThrow();
    })

    it("should error on ArrayBuffer", () => {
        expect(() => never().parse(new ArrayBuffer(1))).toThrow();
    })

    it("should error on Int8Array", () => {
        expect(() => never().parse(new Int8Array(1))).toThrow();
    })

    it("should error on Uint8Array", () => {
        expect(() => never().parse(new Uint8Array(1))).toThrow();
    })

    it("should error on Uint8ClampedArray", () => {
        expect(() => never().parse(new Uint8ClampedArray(1))).toThrow();
    })

    it("should error on Int16Array", () => {
        expect(() => never().parse(new Int16Array(1))).toThrow();
    })

    it("should error on Uint16Array", () => {
        expect(() => never().parse(new Uint16Array(1))).toThrow();
    })

    it("should error on Int32Array", () => {
        expect(() => never().parse(new Int32Array(1))).toThrow();
    })

    it("should error on Uint32Array", () => {
        expect(() => never().parse(new Uint32Array(1))).toThrow();
    })

    it("should error on Float32Array", () => {
        expect(() => never().parse(new Float32Array(1))).toThrow();
    })

    it("should error on Float64Array", () => {
        expect(() => never().parse(new Float64Array(1))).toThrow();
    })

    it("should error on BigInt64Array", () => {
        expect(() => never().parse(new BigInt64Array(1))).toThrow();
    })

    it("should error on BigUint64Array", () => {
        expect(() => never().parse(new BigUint64Array(1))).toThrow();
    })

    it("should error on native enum variant", () => {
        expect(() => never().parse(Foo.A)).toThrow();
        expect(() => never().parse(Foo.B)).toThrow();
        expect(() => never().parse(Foo.C)).toThrow();
        expect(() => never().parse(Foo.D)).toThrow();
    })

    it("should error on instance", () => {
        expect(() => never().parse(new Bar())).toThrow();
        expect(() => never().parse(new Baz())).toThrow();
    })

    it("should error on regex", () => {
        expect(never().parse(/./)).toEqual(/./);
    })
});