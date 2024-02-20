import { describe, expect, test, it, expectTypeOf } from 'vitest'
import { nen } from '../parsers/NativeEnumParser.js';

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

describe("native enum", () => {
    it("should parse to correct type", () => {
        expectTypeOf(() => nen(Foo).parse(null)).returns.toMatchTypeOf<Foo>();
        const parser = nen(Foo);
        const a: Foo = Foo.A;
        const b: ReturnType<typeof parser.parse> = a;
        const c: Foo = Foo.B;
        const d: ReturnType<typeof parser.parse> = c;
        const e: Foo = Foo.C;
        const f: ReturnType<typeof parser.parse> = e;
        const g: Foo = Foo.D;
        const h: ReturnType<typeof parser.parse> = g;
    })

    it("should error on true", () => {
        expect(() => nen(Foo).parse(true)).toThrow();
    });
    
    it("should error on false", () => {
        expect(() => nen(Foo).parse(false)).toThrow();
    });

    it("should error on number", () => {
        expect(() => nen(Foo).parse(1)).toThrow();
    })

    it("should error on string", () => {
        expect(() => nen(Foo).parse("")).toThrow();
    })

    it("should error on object", () => {
        expect(() => nen(Foo).parse({})).toThrow();
    })

    it("should error on array", () => {
        expect(() => nen(Foo).parse([])).toThrow();
    })

    it("should error on null", () => {
        expect(() => nen(Foo).parse(null)).toThrow();
    })

    it("should error on undefined", () => {
        expect(() => nen(Foo).parse(undefined)).toThrow();
    })

    it("should error on NaN", () => {
        expect(() => nen(Foo).parse(NaN)).toThrow();
    })

    it("should error on Infinity", () => {
        expect(() => nen(Foo).parse(Infinity)).toThrow();
    })

    it("should error on -Infinity", () => {
        expect(() => nen(Foo).parse(-Infinity)).toThrow();
    })

    it("should error on function", () => {
        expect(() => nen(Foo).parse(() => {})).toThrow();
    })

    it("should error on symbol", () => {
        expect(() => nen(Foo).parse(Symbol())).toThrow();
    })

    it("should error on Date", () => {
        expect(() => nen(Foo).parse(new Date())).toThrow();
    })

    it("should error on BigInt", () => {
        expect(() => nen(Foo).parse(BigInt(1))).toThrow();
    })

    it("should error on Map", () => {
        expect(() => nen(Foo).parse(new Map())).toThrow();
    })

    it("should error on Set", () => {
        expect(() => nen(Foo).parse(new Set())).toThrow();
    })

    it("should error on WeakMap", () => {
        expect(() => nen(Foo).parse(new WeakMap())).toThrow();
    })

    it("should error on WeakSet", () => {
        expect(() => nen(Foo).parse(new WeakSet())).toThrow();
    })

    it("should error on ArrayBuffer", () => {
        expect(() => nen(Foo).parse(new ArrayBuffer(1))).toThrow();
    })

    it("should error on Int8Array", () => {
        expect(() => nen(Foo).parse(new Int8Array(1))).toThrow();
    })

    it("should error on Uint8Array", () => {
        expect(() => nen(Foo).parse(new Uint8Array(1))).toThrow();
    })

    it("should error on Uint8ClampedArray", () => {
        expect(() => nen(Foo).parse(new Uint8ClampedArray(1))).toThrow();
    })

    it("should error on Int16Array", () => {
        expect(() => nen(Foo).parse(new Int16Array(1))).toThrow();
    })

    it("should error on Uint16Array", () => {
        expect(() => nen(Foo).parse(new Uint16Array(1))).toThrow();
    })

    it("should error on Int32Array", () => {
        expect(() => nen(Foo).parse(new Int32Array(1))).toThrow();
    })

    it("should error on Uint32Array", () => {
        expect(() => nen(Foo).parse(new Uint32Array(1))).toThrow();
    })

    it("should error on Float32Array", () => {
        expect(() => nen(Foo).parse(new Float32Array(1))).toThrow();
    })

    it("should error on Float64Array", () => {
        expect(() => nen(Foo).parse(new Float64Array(1))).toThrow();
    })

    it("should error on BigInt64Array", () => {
        expect(() => nen(Foo).parse(new BigInt64Array(1))).toThrow();
    })

    it("should error on BigUint64Array", () => {
        expect(() => nen(Foo).parse(new BigUint64Array(1))).toThrow();
    })

    it("should parse variant", () => {
        expect(nen(Foo).parse('x')).toBe(Foo.A);
        expect(nen(Foo).parse(2)).toBe(Foo.B);
        expect(nen(Foo).parse(3)).toBe(Foo.C);
        expect(nen(Foo).parse('y')).toBe(Foo.D);
    })

    it("should error on invalid variant", () => {
        expect(() => nen(Foo).parse('z')).toThrow();
        expect(() => nen(Foo).parse(0)).toThrow();
    })

    it("should error on instance", () => {
        expect(() => nen(Foo).parse(new Bar())).toThrow();
        expect(() => nen(Foo).parse(new Baz())).toThrow();
    })
});