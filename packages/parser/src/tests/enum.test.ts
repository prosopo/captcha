import { describe, expect, test, it, expectTypeOf } from 'vitest'
import { en } from '../parsers/EnumParser.js';

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

const p = () => en(['a', 'b', 'c'])

describe("enum", () => {
    it("should have correct typename", () => {
        expect(p().name).toBe(`${['a', 'b', 'c'].join(' | ')}`)
    })
    
    it("should parse to correct type", () => {
        const variants = ['a', 'b', 'c'] as const;
        expectTypeOf(() => en(variants).validate(null)).returns.toMatchTypeOf<typeof variants[number]>();
        const parser = en(variants);
        const a: typeof variants[number] = 'a';
        const b: ReturnType<typeof parser.validate> = a;
        const c: typeof variants[number] = 'b';
        const d: ReturnType<typeof parser.validate> = c;
        const e: typeof variants[number] = 'c';
        const f: ReturnType<typeof parser.validate> = e;
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

    it("should parse variant", () => {
        expect(p().validate('a')).toBe('a');
        expect(p().validate('b')).toBe('b');
        expect(p().validate('c')).toBe('c');
    })

    it("should error on invalid variant", () => {
        expect(() => p().validate('d')).toThrow();
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