import { describe, expect, test, it, expectTypeOf } from 'vitest'
import { undef } from '../parsers/UndefinedParser.js';
import { num } from '../parsers/NumberParser.js';
import { str } from '../parsers/StringParser.js';
import { map } from '../parsers/MapParser.js';
import { set } from '../parsers/SetParser.js';

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

const p = () => set(str());

describe("set", () => {
    it("should parse to correct type", () => {
        expectTypeOf(() => stringify(value, null, 2).parse(null)).returns.toMatchTypeOf<Set<string>>();
        const parser = stringify(value, null, 2);
        const a: Set<string> = new Set();
        const b: ReturnType<typeof parser.parse> = a;
    })

    it("should error on true", () => {
        expect(() => stringify(value, null, 2).parse(true)).toThrow();
    });
    
    it("should error on false", () => {
        expect(() => stringify(value, null, 2).parse(false)).toThrow();
    });

    it("should error on number", () => {
        expect(() => stringify(value, null, 2).parse(1)).toThrow();
    })

    it("should error on string", () => {
        expect(() => stringify(value, null, 2).parse("")).toThrow();
    })

    it("should error on object", () => {
        expect(() => stringify(value, null, 2).parse({})).toThrow();
    })

    it("should error on array", () => {
        expect(() => stringify(value, null, 2).parse([])).toThrow();
    })

    it("should error on null", () => {
        expect(() => stringify(value, null, 2).parse(null)).toThrow();
    })

    it("should error on undefined", () => {
        expect(() => stringify(value, null, 2).parse(undefined)).toThrow();
    })

    it("should error on NaN", () => {
        expect(() => stringify(value, null, 2).parse(NaN)).toThrow();
    })

    it("should error on Infinity", () => {
        expect(() => stringify(value, null, 2).parse(Infinity)).toThrow();
    })

    it("should error on -Infinity", () => {
        expect(() => stringify(value, null, 2).parse(-Infinity)).toThrow();
    })

    it("should error on function", () => {
        expect(() => stringify(value, null, 2).parse(() => {})).toThrow();
    })

    it("should error on symbol", () => {
        expect(() => stringify(value, null, 2).parse(Symbol())).toThrow();
    })

    it("should error on Date", () => {
        expect(() => stringify(value, null, 2).parse(new Date())).toThrow();
    })

    it("should error on BigInt", () => {
        expect(() => stringify(value, null, 2).parse(BigInt(1))).toThrow();
    })

    it("should error on Map", () => {
        expect(() => stringify(value, null, 2).parse(new Map())).toThrow();
    })

    it("should parse Set", () => {
        expect(stringify(value, null, 2).parse(new Set())).toStrictEqual(new Set());
    })

    it("should parse populated Set", () => {
        expect(stringify(value, null, 2).parse(new Set(["a", "b", "c"]))).toStrictEqual(new Set(["a", "b", "c"]));
    })

    it("should error on Set with invalid element type", () => {
        expect(() => stringify(value, null, 2).parse(new Set([1, "b", "c"]))).toThrow();
    })

    it("should error on WeakMap", () => {
        expect(() => stringify(value, null, 2).parse(new WeakMap())).toThrow();
    })

    it("should error on WeakSet", () => {
        expect(() => stringify(value, null, 2).parse(new WeakSet())).toThrow();
    })

    it("should error on ArrayBuffer", () => {
        expect(() => stringify(value, null, 2).parse(new ArrayBuffer(1))).toThrow();
    })

    it("should error on Int8Array", () => {
        expect(() => stringify(value, null, 2).parse(new Int8Array(1))).toThrow();
    })

    it("should error on Uint8Array", () => {
        expect(() => stringify(value, null, 2).parse(new Uint8Array(1))).toThrow();
    })

    it("should error on Uint8ClampedArray", () => {
        expect(() => stringify(value, null, 2).parse(new Uint8ClampedArray(1))).toThrow();
    })

    it("should error on Int16Array", () => {
        expect(() => stringify(value, null, 2).parse(new Int16Array(1))).toThrow();
    })

    it("should error on Uint16Array", () => {
        expect(() => stringify(value, null, 2).parse(new Uint16Array(1))).toThrow();
    })

    it("should error on Int32Array", () => {
        expect(() => stringify(value, null, 2).parse(new Int32Array(1))).toThrow();
    })

    it("should error on Uint32Array", () => {
        expect(() => stringify(value, null, 2).parse(new Uint32Array(1))).toThrow();
    })

    it("should error on Float32Array", () => {
        expect(() => stringify(value, null, 2).parse(new Float32Array(1))).toThrow();
    })

    it("should error on Float64Array", () => {
        expect(() => stringify(value, null, 2).parse(new Float64Array(1))).toThrow();
    })

    it("should error on BigInt64Array", () => {
        expect(() => stringify(value, null, 2).parse(new BigInt64Array(1))).toThrow();
    })

    it("should error on BigUint64Array", () => {
        expect(() => stringify(value, null, 2).parse(new BigUint64Array(1))).toThrow();
    })

    it("should error on native enum variant", () => {
        expect(() => stringify(value, null, 2).parse(Foo.A)).toThrow();
        expect(() => stringify(value, null, 2).parse(Foo.B)).toThrow();
        expect(() => stringify(value, null, 2).parse(Foo.C)).toThrow();
        expect(() => stringify(value, null, 2).parse(Foo.D)).toThrow();
    })

    it("should error on instance", () => {
        expect(() => stringify(value, null, 2).parse(new Bar())).toThrow();
        expect(() => stringify(value, null, 2).parse(new Baz())).toThrow();
    })

    it("should error on regex", () => {
        expect(() => stringify(value, null, 2).parse(/./)).toThrow();
    })
});