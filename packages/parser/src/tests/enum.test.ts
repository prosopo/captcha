import { describe, expect, test, it } from 'vitest'
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

describe("enum", () => {
    it("should error on true", () => {
        expect(() => en(['a', 'b', 'c']).parse(true)).toThrow();
    });
    
    it("should error on false", () => {
        expect(() => en(['a', 'b', 'c']).parse(false)).toThrow();
    });

    it("should error on number", () => {
        expect(() => en(['a', 'b', 'c']).parse(1)).toThrow();
    })

    it("should error on string", () => {
        expect(() => en(['a', 'b', 'c']).parse("")).toThrow();
    })

    it("should error on object", () => {
        expect(() => en(['a', 'b', 'c']).parse({})).toThrow();
    })

    it("should error on array", () => {
        expect(() => en(['a', 'b', 'c']).parse([])).toThrow();
    })

    it("should error on null", () => {
        expect(() => en(['a', 'b', 'c']).parse(null)).toThrow();
    })

    it("should error on undefined", () => {
        expect(() => en(['a', 'b', 'c']).parse(undefined)).toThrow();
    })

    it("should error on NaN", () => {
        expect(() => en(['a', 'b', 'c']).parse(NaN)).toThrow();
    })

    it("should error on Infinity", () => {
        expect(() => en(['a', 'b', 'c']).parse(Infinity)).toThrow();
    })

    it("should error on -Infinity", () => {
        expect(() => en(['a', 'b', 'c']).parse(-Infinity)).toThrow();
    })

    it("should error on function", () => {
        expect(() => en(['a', 'b', 'c']).parse(() => {})).toThrow();
    })

    it("should error on symbol", () => {
        expect(() => en(['a', 'b', 'c']).parse(Symbol())).toThrow();
    })

    it("should error on Date", () => {
        expect(() => en(['a', 'b', 'c']).parse(new Date())).toThrow();
    })

    it("should error on BigInt", () => {
        expect(() => en(['a', 'b', 'c']).parse(BigInt(1))).toThrow();
    })

    it("should error on Map", () => {
        expect(() => en(['a', 'b', 'c']).parse(new Map())).toThrow();
    })

    it("should error on Set", () => {
        expect(() => en(['a', 'b', 'c']).parse(new Set())).toThrow();
    })

    it("should error on WeakMap", () => {
        expect(() => en(['a', 'b', 'c']).parse(new WeakMap())).toThrow();
    })

    it("should error on WeakSet", () => {
        expect(() => en(['a', 'b', 'c']).parse(new WeakSet())).toThrow();
    })

    it("should error on ArrayBuffer", () => {
        expect(() => en(['a', 'b', 'c']).parse(new ArrayBuffer(1))).toThrow();
    })

    it("should error on Int8Array", () => {
        expect(() => en(['a', 'b', 'c']).parse(new Int8Array(1))).toThrow();
    })

    it("should error on Uint8Array", () => {
        expect(() => en(['a', 'b', 'c']).parse(new Uint8Array(1))).toThrow();
    })

    it("should error on Uint8ClampedArray", () => {
        expect(() => en(['a', 'b', 'c']).parse(new Uint8ClampedArray(1))).toThrow();
    })

    it("should error on Int16Array", () => {
        expect(() => en(['a', 'b', 'c']).parse(new Int16Array(1))).toThrow();
    })

    it("should error on Uint16Array", () => {
        expect(() => en(['a', 'b', 'c']).parse(new Uint16Array(1))).toThrow();
    })

    it("should error on Int32Array", () => {
        expect(() => en(['a', 'b', 'c']).parse(new Int32Array(1))).toThrow();
    })

    it("should error on Uint32Array", () => {
        expect(() => en(['a', 'b', 'c']).parse(new Uint32Array(1))).toThrow();
    })

    it("should error on Float32Array", () => {
        expect(() => en(['a', 'b', 'c']).parse(new Float32Array(1))).toThrow();
    })

    it("should error on Float64Array", () => {
        expect(() => en(['a', 'b', 'c']).parse(new Float64Array(1))).toThrow();
    })

    it("should error on BigInt64Array", () => {
        expect(() => en(['a', 'b', 'c']).parse(new BigInt64Array(1))).toThrow();
    })

    it("should error on BigUint64Array", () => {
        expect(() => en(['a', 'b', 'c']).parse(new BigUint64Array(1))).toThrow();
    })

    it("should parse variant", () => {
        expect(en(['a', 'b', 'c']).parse('a')).toBe('a');
        expect(en(['a', 'b', 'c']).parse('b')).toBe('b');
        expect(en(['a', 'b', 'c']).parse('c')).toBe('c');
    })

    it("should error on invalid variant", () => {
        expect(() => en(['a', 'b', 'c']).parse('d')).toThrow();
    })

    it("should error on native enum variant", () => {
        expect(() => en(['a', 'b', 'c']).parse(Foo.A)).toThrow();
        expect(() => en(['a', 'b', 'c']).parse(Foo.B)).toThrow();
        expect(() => en(['a', 'b', 'c']).parse(Foo.C)).toThrow();
        expect(() => en(['a', 'b', 'c']).parse(Foo.D)).toThrow();
    })

    it("should error on instance", () => {
        expect(() => en(['a', 'b', 'c']).parse(new Bar())).toThrow();
        expect(() => en(['a', 'b', 'c']).parse(new Baz())).toThrow();
    })
});