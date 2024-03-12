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

const p = () => nen(Foo);

describe("native enum", () => {
    it("should have correct typename", () => {
        expect(p().name).toBe(`${p().variants.join(" | ")}`)
    })
    
    it("should parse to correct type", () => {
        expectTypeOf(() => p().parse(null)).returns.toMatchTypeOf<Foo>();
        const parser = p();
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
        expect(() => p().parse(true)).toThrow();
    });
    
    it("should error on false", () => {
        expect(() => p().parse(false)).toThrow();
    });

    it("should error on number", () => {
        expect(() => p().parse(1)).toThrow();
    })

    it("should error on string", () => {
        expect(() => p().parse("")).toThrow();
    })

    it("should error on object", () => {
        expect(() => p().parse({})).toThrow();
    })

    it("should error on array", () => {
        expect(() => p().parse([])).toThrow();
    })

    it("should error on null", () => {
        expect(() => p().parse(null)).toThrow();
    })

    it("should error on undefined", () => {
        expect(() => p().parse(undefined)).toThrow();
    })

    it("should error on NaN", () => {
        expect(() => p().parse(NaN)).toThrow();
    })

    it("should error on Infinity", () => {
        expect(() => p().parse(Infinity)).toThrow();
    })

    it("should error on -Infinity", () => {
        expect(() => p().parse(-Infinity)).toThrow();
    })

    it("should error on function", () => {
        expect(() => p().parse(() => {})).toThrow();
    })

    it("should error on symbol", () => {
        expect(() => p().parse(Symbol())).toThrow();
    })

    it("should error on Date", () => {
        expect(() => p().parse(new Date())).toThrow();
    })

    it("should error on BigInt", () => {
        expect(() => p().parse(BigInt(1))).toThrow();
    })

    it("should error on Map", () => {
        expect(() => p().parse(new Map())).toThrow();
    })

    it("should error on Set", () => {
        expect(() => p().parse(new Set())).toThrow();
    })

    it("should error on WeakMap", () => {
        expect(() => p().parse(new WeakMap())).toThrow();
    })

    it("should error on WeakSet", () => {
        expect(() => p().parse(new WeakSet())).toThrow();
    })

    it("should error on ArrayBuffer", () => {
        expect(() => p().parse(new ArrayBuffer(1))).toThrow();
    })

    it("should error on Int8Array", () => {
        expect(() => p().parse(new Int8Array(1))).toThrow();
    })

    it("should error on Uint8Array", () => {
        expect(() => p().parse(new Uint8Array(1))).toThrow();
    })

    it("should error on Uint8ClampedArray", () => {
        expect(() => p().parse(new Uint8ClampedArray(1))).toThrow();
    })

    it("should error on Int16Array", () => {
        expect(() => p().parse(new Int16Array(1))).toThrow();
    })

    it("should error on Uint16Array", () => {
        expect(() => p().parse(new Uint16Array(1))).toThrow();
    })

    it("should error on Int32Array", () => {
        expect(() => p().parse(new Int32Array(1))).toThrow();
    })

    it("should error on Uint32Array", () => {
        expect(() => p().parse(new Uint32Array(1))).toThrow();
    })

    it("should error on Float32Array", () => {
        expect(() => p().parse(new Float32Array(1))).toThrow();
    })

    it("should error on Float64Array", () => {
        expect(() => p().parse(new Float64Array(1))).toThrow();
    })

    it("should error on BigInt64Array", () => {
        expect(() => p().parse(new BigInt64Array(1))).toThrow();
    })

    it("should error on BigUint64Array", () => {
        expect(() => p().parse(new BigUint64Array(1))).toThrow();
    })

    it("should parse variant", () => {
        expect(p().parse('x')).toBe(Foo.A);
        expect(p().parse(2)).toBe(Foo.B);
        expect(p().parse(3)).toBe(Foo.C);
        expect(p().parse('y')).toBe(Foo.D);
    })

    it("should error on invalid variant", () => {
        expect(() => p().parse('z')).toThrow();
        expect(() => p().parse(0)).toThrow();
    })

    it("should error on instance", () => {
        expect(() => p().parse(new Bar())).toThrow();
        expect(() => p().parse(new Baz())).toThrow();
    })

    it("should error on regex", () => {
        expect(() => p().parse(/./)).toThrow();
    })
});