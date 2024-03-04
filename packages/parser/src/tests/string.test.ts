import { describe, expect, test, it, expectTypeOf } from 'vitest'
import { str } from '../parsers/StringParser.js';

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

describe("string", () => {
    it("should parse to correct type", () => {
        expectTypeOf(() => str().parse(null)).returns.toMatchTypeOf<string>();
        const parser = str()
        const a: string = "x"
        const b: ReturnType<typeof parser.parse> = a
    })

    it("should error on true", () => {
        expect(() => str().parse(true)).toThrow();
    });
    
    it("should error on false", () => {
        expect(() => str().parse(false)).toThrow();
    });

    it("should error on number", () => {
        expect(() => str().parse(1)).toThrow();
    })

    it("should parse string", () => {
        expect(str().parse("")).toBe("");
    })

    it("should error on object", () => {
        expect(() => str().parse({})).toThrow();
    })

    it("should error on array", () => {
        expect(() => str().parse([])).toThrow();
    })

    it("should error on null", () => {
        expect(() => str().parse(null)).toThrow();
    })

    it("should error on undefined", () => {
        expect(() => str().parse(undefined)).toThrow();
    })

    it("should error on NaN", () => {
        expect(() => str().parse(NaN)).toThrow();
    })

    it("should error on Infinity", () => {
        expect(() => str().parse(Infinity)).toThrow();
    })

    it("should error on -Infinity", () => {
        expect(() => str().parse(-Infinity)).toThrow();
    })

    it("should error on function", () => {
        expect(() => str().parse(() => {})).toThrow();
    })

    it("should error on symbol", () => {
        expect(() => str().parse(Symbol())).toThrow();
    })

    it("should error on Date", () => {
        expect(() => str().parse(new Date())).toThrow();
    })

    it("should error on BigInt", () => {
        expect(() => str().parse(BigInt(1))).toThrow();
    })

    it("should error on Map", () => {
        expect(() => str().parse(new Map())).toThrow();
    })

    it("should error on Set", () => {
        expect(() => str().parse(new Set())).toThrow();
    })

    it("should error on WeakMap", () => {
        expect(() => str().parse(new WeakMap())).toThrow();
    })

    it("should error on WeakSet", () => {
        expect(() => str().parse(new WeakSet())).toThrow();
    })

    it("should error on ArrayBuffer", () => {
        expect(() => str().parse(new ArrayBuffer(1))).toThrow();
    })

    it("should error on Int8Array", () => {
        expect(() => str().parse(new Int8Array(1))).toThrow();
    })

    it("should error on Uint8Array", () => {
        expect(() => str().parse(new Uint8Array(1))).toThrow();
    })

    it("should error on Uint8ClampedArray", () => {
        expect(() => str().parse(new Uint8ClampedArray(1))).toThrow();
    })

    it("should error on Int16Array", () => {
        expect(() => str().parse(new Int16Array(1))).toThrow();
    })

    it("should error on Uint16Array", () => {
        expect(() => str().parse(new Uint16Array(1))).toThrow();
    })

    it("should error on Int32Array", () => {
        expect(() => str().parse(new Int32Array(1))).toThrow();
    })

    it("should error on Uint32Array", () => {
        expect(() => str().parse(new Uint32Array(1))).toThrow();
    })

    it("should error on Float32Array", () => {
        expect(() => str().parse(new Float32Array(1))).toThrow();
    })

    it("should error on Float64Array", () => {
        expect(() => str().parse(new Float64Array(1))).toThrow();
    })

    it("should error on BigInt64Array", () => {
        expect(() => str().parse(new BigInt64Array(1))).toThrow();
    })

    it("should error on BigUint64Array", () => {
        expect(() => str().parse(new BigUint64Array(1))).toThrow();
    })

    it("should error on native enum variant", () => {
        expect(() => str().parse(Foo.B)).toThrow();
        expect(() => str().parse(Foo.C)).toThrow();
    })

    it("should parse native enum variant with string value", () => {
        expect(str().parse(Foo.A)).toBe("x");
        expect(str().parse(Foo.D)).toBe("y");
    })

    it("should error on instance", () => {
        expect(() => str().parse(new Bar())).toThrow();
        expect(() => str().parse(new Baz())).toThrow();
    })

    it("should error on regex", () => {
        expect(str().parse(/./)).toEqual(/./);
    })
});