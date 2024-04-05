import { describe, expect, test, it, expectTypeOf } from 'vitest'
import { num } from '../parsers/NumberParser.js';
import { u8 } from '../parsers/U8Parser.js';
import { finiteNum } from '../parsers/FiniteNumberParser.js';
import { boundNum } from '../parsers/BoundNumberParser.js';

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

const p = () => boundNum(1, 10)

describe("bound number", () => {
    it("should have correct typename", () => {
        expect(p().name).toBe(`number(1<=x<=10)`)
    })
    
    it("should parse 1-10", () => {
        for (let i = 1; i <= 10; i++) {
            expect(p().shape(i)).toBe(i);
        }
    })

    it("should error on < 1", () => {
        expect(() => p().shape(0)).toThrow();
        expect(() => p().shape(Number.MIN_VALUE)).toThrow();
    })

    it("should error on > 10", () => {
        expect(() => p().shape(11)).toThrow();
        expect(() => p().shape(Number.MAX_VALUE)).toThrow();
    })

    it("should parse to correct type", () => {
        expectTypeOf(() => p().shape(null)).returns.toMatchTypeOf<number>();
        const parser = p();
        const a: number = 1;
        const b: ReturnType<typeof parser.shape> = a;
    })

    it("should fail on true", () => {
        expect(() => p().shape(true)).toThrow();
    });
    
    it("should fail on false", () => {
        expect(() => p().shape(false)).toThrow();
    });

    it("should parse number", () => {
        expect(p().shape(1)).toBe(1);
    })

    it("should error on string", () => {
        expect(() => p().shape("")).toThrow();
    })

    it("should error on object", () => {
        expect(() => p().shape({})).toThrow();
    })

    it("should error on array", () => {
        expect(() => p().shape([])).toThrow();
    })

    it("should error on null", () => {
        expect(() => p().shape(null)).toThrow();
    })

    it("should error on undefined", () => {
        expect(() => p().shape(undefined)).toThrow();
    })

    it("should error on NaN", () => {
        expect(() => p().shape(NaN)).toThrow();
    })

    it("should error on Infinity", () => {
        expect(() => p().shape(Infinity)).toThrow();
    })

    it("should error on -Infinity", () => {
        expect(() => p().shape(-Infinity)).toThrow();
    })

    it("should error on function", () => {
        expect(() => p().shape(() => {})).toThrow();
    })

    it("should error on symbol", () => {
        expect(() => p().shape(Symbol())).toThrow();
    })

    it("should error on Date", () => {
        expect(() => p().shape(new Date())).toThrow();
    })

    it("should error on BigInt", () => {
        expect(() => p().shape(BigInt(1))).toThrow();
    })

    it("should error on Map", () => {
        expect(() => p().shape(new Map())).toThrow();
    })

    it("should error on Set", () => {
        expect(() => p().shape(new Set())).toThrow();
    })

    it("should error on WeakMap", () => {
        expect(() => p().shape(new WeakMap())).toThrow();
    })

    it("should error on WeakSet", () => {
        expect(() => p().shape(new WeakSet())).toThrow();
    })

    it("should error on ArrayBuffer", () => {
        expect(() => p().shape(new ArrayBuffer(1))).toThrow();
    })

    it("should error on Int8Array", () => {
        expect(() => p().shape(new Int8Array(1))).toThrow();
    })

    it("should error on Uint8Array", () => {
        expect(() => p().shape(new Uint8Array(1))).toThrow();
    })

    it("should error on Uint8ClampedArray", () => {
        expect(() => p().shape(new Uint8ClampedArray(1))).toThrow();
    })

    it("should error on Int16Array", () => {
        expect(() => p().shape(new Int16Array(1))).toThrow();
    })

    it("should error on Uint16Array", () => {
        expect(() => p().shape(new Uint16Array(1))).toThrow();
    })

    it("should error on Int32Array", () => {
        expect(() => p().shape(new Int32Array(1))).toThrow();
    })

    it("should error on Uint32Array", () => {
        expect(() => p().shape(new Uint32Array(1))).toThrow();
    })

    it("should error on Float32Array", () => {
        expect(() => p().shape(new Float32Array(1))).toThrow();
    })

    it("should error on Float64Array", () => {
        expect(() => p().shape(new Float64Array(1))).toThrow();
    })

    it("should error on BigInt64Array", () => {
        expect(() => p().shape(new BigInt64Array(1))).toThrow();
    })

    it("should error on BigUint64Array", () => {
        expect(() => p().shape(new BigUint64Array(1))).toThrow();
    })

    it("should error on native enum variant", () => {
        expect(() => p().shape(Foo.A)).toThrow();
        expect(() => p().shape(Foo.D)).toThrow();
    })

    it("should parse native enum variant with number value", () => {
        expect(p().shape(Foo.B)).toBe(2);
        expect(p().shape(Foo.C)).toBe(3);
    })

    it("should error on instance", () => {
        expect(() => p().shape(new Bar())).toThrow();
        expect(() => p().shape(new Baz())).toThrow();
    })

    it("should error on regex", () => {
        expect(() => p().shape(/./)).toThrow();
    })
});