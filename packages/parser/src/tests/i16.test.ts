import { describe, expect, test, it, expectTypeOf } from 'vitest'
import { num } from '../parsers/NumberParser.js';
import { u8 } from '../parsers/U8Parser.js';
import { i8 } from '../parsers/I8Parser.js';
import { i16 } from '../parsers/I16Parser.js';

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

const p = i16
const min = -Math.pow(2, 16) / 2;
const max = Math.pow(2, 16) / 2 - 1;

describe("i16", () => {
    it("should have correct typename", () => {
        expect(p().name).toBe(`i16`)
    })
    
    it(`should error on < ${min}`, () => {
        expect(() => p().validate(min - 1)).toThrow();
    })

    it(`should error on > ${max}`, () => {
        expect(() => p().validate(max + 1)).toThrow();
    })

    it(`should parse ${min} - ${max}`, () => {
        expect(p().validate(min)).toBe(min);
        expect(p().validate(max)).toBe(max);
    })

    it("should parse to correct type", () => {
        expectTypeOf(() => p().validate(null)).returns.toMatchTypeOf<number>();
        const parser = p();
        const a: number = 1;
        const b: ReturnType<typeof parser.validate> = a;
    })

    it("should fail on true", () => {
        expect(() => p().validate(true)).toThrow();
    });
    
    it("should fail on false", () => {
        expect(() => p().validate(false)).toThrow();
    });

    it("should parse number", () => {
        expect(p().validate(1)).toBe(1);
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
        expect(() => p().validate(Foo.D)).toThrow();
    })

    it("should parse native enum variant with number value", () => {
        expect(p().validate(Foo.B)).toBe(2);
        expect(p().validate(Foo.C)).toBe(3);
    })

    it("should error on instance", () => {
        expect(() => p().validate(new Bar())).toThrow();
        expect(() => p().validate(new Baz())).toThrow();
    })

    it("should error on regex", () => {
        expect(() => p().validate(/./)).toThrow();
    })
});