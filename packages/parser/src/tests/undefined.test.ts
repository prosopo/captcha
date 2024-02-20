import { describe, expect, test, it, expectTypeOf } from 'vitest'
import { undef } from '../parsers/UndefinedParser.js';

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

describe("undefined", () => {
    it("should parse to correct type", () => {
        expectTypeOf(() => undef().parse(null)).returns.toMatchTypeOf<undefined>();
        const parser = undef();
        const a: undefined = undefined
        const b: ReturnType<typeof parser.parse> = a
    })

    it("should error on true", () => {
        expect(() => undef().parse(true)).toThrow();
    });
    
    it("should error on false", () => {
        expect(() => undef().parse(false)).toThrow();
    });

    it("should error on number", () => {
        expect(() => undef().parse(1)).toThrow();
    })

    it("should error on string", () => {
        expect(() => undef().parse("")).toThrow();
    })

    it("should error on object", () => {
        expect(() => undef().parse({})).toThrow();
    })

    it("should error on array", () => {
        expect(() => undef().parse([])).toThrow();
    })

    it("should error on null", () => {
        expect(() => undef().parse(null)).toThrow();
    })

    it("should parse undefined", () => {
        expect(undef().parse(undefined)).toBe(undefined);
    })

    it("should error on NaN", () => {
        expect(() => undef().parse(NaN)).toThrow();
    })

    it("should error on Infinity", () => {
        expect(() => undef().parse(Infinity)).toThrow();
    })

    it("should error on -Infinity", () => {
        expect(() => undef().parse(-Infinity)).toThrow();
    })

    it("should error on function", () => {
        expect(() => undef().parse(() => {})).toThrow();
    })

    it("should error on symbol", () => {
        expect(() => undef().parse(Symbol())).toThrow();
    })

    it("should error on Date", () => {
        expect(() => undef().parse(new Date())).toThrow();
    })

    it("should error on BigInt", () => {
        expect(() => undef().parse(BigInt(1))).toThrow();
    })

    it("should error on Map", () => {
        expect(() => undef().parse(new Map())).toThrow();
    })

    it("should error on Set", () => {
        expect(() => undef().parse(new Set())).toThrow();
    })

    it("should error on WeakMap", () => {
        expect(() => undef().parse(new WeakMap())).toThrow();
    })

    it("should error on WeakSet", () => {
        expect(() => undef().parse(new WeakSet())).toThrow();
    })

    it("should error on ArrayBuffer", () => {
        expect(() => undef().parse(new ArrayBuffer(1))).toThrow();
    })

    it("should error on Int8Array", () => {
        expect(() => undef().parse(new Int8Array(1))).toThrow();
    })

    it("should error on Uint8Array", () => {
        expect(() => undef().parse(new Uint8Array(1))).toThrow();
    })

    it("should error on Uint8ClampedArray", () => {
        expect(() => undef().parse(new Uint8ClampedArray(1))).toThrow();
    })

    it("should error on Int16Array", () => {
        expect(() => undef().parse(new Int16Array(1))).toThrow();
    })

    it("should error on Uint16Array", () => {
        expect(() => undef().parse(new Uint16Array(1))).toThrow();
    })

    it("should error on Int32Array", () => {
        expect(() => undef().parse(new Int32Array(1))).toThrow();
    })

    it("should error on Uint32Array", () => {
        expect(() => undef().parse(new Uint32Array(1))).toThrow();
    })

    it("should error on Float32Array", () => {
        expect(() => undef().parse(new Float32Array(1))).toThrow();
    })

    it("should error on Float64Array", () => {
        expect(() => undef().parse(new Float64Array(1))).toThrow();
    })

    it("should error on BigInt64Array", () => {
        expect(() => undef().parse(new BigInt64Array(1))).toThrow();
    })

    it("should error on BigUint64Array", () => {
        expect(() => undef().parse(new BigUint64Array(1))).toThrow();
    })

    it("should error on native enum variant", () => {
        expect(() => undef().parse(Foo.A)).toThrow();
        expect(() => undef().parse(Foo.B)).toThrow();
        expect(() => undef().parse(Foo.C)).toThrow();
        expect(() => undef().parse(Foo.D)).toThrow();
    })

    it("should error on instance", () => {
        expect(() => undef().parse(new Bar())).toThrow();
        expect(() => undef().parse(new Baz())).toThrow();
    })
});