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
        expectTypeOf(() => en(variants).parse(null)).returns.toMatchTypeOf<typeof variants[number]>();
        const parser = en(variants);
        const a: typeof variants[number] = 'a';
        const b: ReturnType<typeof parser.parse> = a;
        const c: typeof variants[number] = 'b';
        const d: ReturnType<typeof parser.parse> = c;
        const e: typeof variants[number] = 'c';
        const f: ReturnType<typeof parser.parse> = e;
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
        expect(p().parse('a')).toBe('a');
        expect(p().parse('b')).toBe('b');
        expect(p().parse('c')).toBe('c');
    })

    it("should error on invalid variant", () => {
        expect(() => p().parse('d')).toThrow();
    })

    it("should error on native enum variant", () => {
        expect(() => p().parse(Foo.A)).toThrow();
        expect(() => p().parse(Foo.B)).toThrow();
        expect(() => p().parse(Foo.C)).toThrow();
        expect(() => p().parse(Foo.D)).toThrow();
    })

    it("should error on instance", () => {
        expect(() => p().parse(new Bar())).toThrow();
        expect(() => p().parse(new Baz())).toThrow();
    })

    it("should error on regex", () => {
        expect(() => p().parse(/./)).toThrow();
    })
});