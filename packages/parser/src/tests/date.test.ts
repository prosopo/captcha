import { describe, expect, test, it, expectTypeOf } from 'vitest'
import { dat } from '../parsers/DateParser.js';

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

describe("date", () => {
    it("should parse to correct type", () => {
        expectTypeOf(() => dat().parse(null)).returns.toMatchTypeOf<Date>();
        const parser = dat();
        const a: Date = new Date();
        const b: ReturnType<typeof parser.parse> = a;
    })

    it("should error on true", () => {
        expect(() => dat().parse(true)).toThrow();
    });
    
    it("should error on false", () => {
        expect(() => dat().parse(false)).toThrow();
    });

    it("should error on number", () => {
        expect(() => dat().parse(1)).toThrow();
    })

    it("should error on string", () => {
        expect(() => dat().parse("")).toThrow();
    })

    it("should error on object", () => {
        expect(() => dat().parse({})).toThrow();
    })

    it("should error on array", () => {
        expect(() => dat().parse([])).toThrow();
    })

    it("should error on null", () => {
        expect(() => dat().parse(null)).toThrow();
    })

    it("should error on undefined", () => {
        expect(() => dat().parse(undefined)).toThrow();
    })

    it("should error on NaN", () => {
        expect(() => dat().parse(NaN)).toThrow();
    })

    it("should error on Infinity", () => {
        expect(() => dat().parse(Infinity)).toThrow();
    })

    it("should error on -Infinity", () => {
        expect(() => dat().parse(-Infinity)).toThrow();
    })

    it("should error on function", () => {
        expect(() => dat().parse(() => {})).toThrow();
    })

    it("should error on symbol", () => {
        expect(() => dat().parse(Symbol())).toThrow();
    })

    it("should parse Date", () => {
        const d = new Date();
        expect(dat().parse(d)).toBe(d);
    })

    it("should error on BigInt", () => {
        expect(() => dat().parse(BigInt(1))).toThrow();
    })

    it("should error on Map", () => {
        expect(() => dat().parse(new Map())).toThrow();
    })

    it("should error on Set", () => {
        expect(() => dat().parse(new Set())).toThrow();
    })

    it("should error on WeakMap", () => {
        expect(() => dat().parse(new WeakMap())).toThrow();
    })

    it("should error on WeakSet", () => {
        expect(() => dat().parse(new WeakSet())).toThrow();
    })

    it("should error on ArrayBuffer", () => {
        expect(() => dat().parse(new ArrayBuffer(1))).toThrow();
    })

    it("should error on Int8Array", () => {
        expect(() => dat().parse(new Int8Array(1))).toThrow();
    })

    it("should error on Uint8Array", () => {
        expect(() => dat().parse(new Uint8Array(1))).toThrow();
    })

    it("should error on Uint8ClampedArray", () => {
        expect(() => dat().parse(new Uint8ClampedArray(1))).toThrow();
    })

    it("should error on Int16Array", () => {
        expect(() => dat().parse(new Int16Array(1))).toThrow();
    })

    it("should error on Uint16Array", () => {
        expect(() => dat().parse(new Uint16Array(1))).toThrow();
    })

    it("should error on Int32Array", () => {
        expect(() => dat().parse(new Int32Array(1))).toThrow();
    })

    it("should error on Uint32Array", () => {
        expect(() => dat().parse(new Uint32Array(1))).toThrow();
    })

    it("should error on Float32Array", () => {
        expect(() => dat().parse(new Float32Array(1))).toThrow();
    })

    it("should error on Float64Array", () => {
        expect(() => dat().parse(new Float64Array(1))).toThrow();
    })

    it("should error on BigInt64Array", () => {
        expect(() => dat().parse(new BigInt64Array(1))).toThrow();
    })

    it("should error on BigUint64Array", () => {
        expect(() => dat().parse(new BigUint64Array(1))).toThrow();
    })

    it("should error on native enum variant", () => {
        expect(() => dat().parse(Foo.A)).toThrow();
        expect(() => dat().parse(Foo.B)).toThrow();
        expect(() => dat().parse(Foo.C)).toThrow();
        expect(() => dat().parse(Foo.D)).toThrow();
    })

    it("should error on instance", () => {
        expect(() => dat().parse(new Bar())).toThrow();
        expect(() => dat().parse(new Baz())).toThrow();
    })
});