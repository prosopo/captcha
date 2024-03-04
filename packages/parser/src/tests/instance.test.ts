import { describe, expect, test, it, expectTypeOf } from 'vitest'
import { inst } from '../parsers/InstanceParser.js';

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

describe("undefined", () => {
    it("should parse to correct type", () => {
        expectTypeOf(() => inst(Bar).parse(null)).returns.toMatchTypeOf<Bar>();
        expectTypeOf(() => inst(Baz).parse(null)).returns.toEqualTypeOf<Baz>();
        const parser = inst(Bar);
        const a: Bar = new Bar();
        const b: ReturnType<typeof parser.parse> = a;
        const parser2 = inst(Baz);
        const c: Baz = new Baz();
        const d: ReturnType<typeof parser2.parse> = c;
    })

    it("should error on true", () => {
        expect(() => inst(Bar).parse(true)).toThrow();
    });
    
    it("should error on false", () => {
        expect(() => inst(Bar).parse(false)).toThrow();
    });

    it("should error on number", () => {
        expect(() => inst(Bar).parse(1)).toThrow();
    })

    it("should error on string", () => {
        expect(() => inst(Bar).parse("")).toThrow();
    })

    it("should error on object", () => {
        expect(() => inst(Bar).parse({})).toThrow();
    })

    it("should error on array", () => {
        expect(() => inst(Bar).parse([])).toThrow();
    })

    it("should error on null", () => {
        expect(() => inst(Bar).parse(null)).toThrow();
    })

    it("should error on undefined", () => {
        expect(() => inst(Bar).parse(undefined)).toThrow();
    })

    it("should error on NaN", () => {
        expect(() => inst(Bar).parse(NaN)).toThrow();
    })

    it("should error on Infinity", () => {
        expect(() => inst(Bar).parse(Infinity)).toThrow();
    })

    it("should error on -Infinity", () => {
        expect(() => inst(Bar).parse(-Infinity)).toThrow();
    })

    it("should error on function", () => {
        expect(() => inst(Bar).parse(() => {})).toThrow();
    })

    it("should error on symbol", () => {
        expect(() => inst(Bar).parse(Symbol())).toThrow();
    })

    it("should error on Date", () => {
        expect(() => inst(Bar).parse(new Date())).toThrow();
    })

    it("should error on BigInt", () => {
        expect(() => inst(Bar).parse(BigInt(1))).toThrow();
    })

    it("should error on Map", () => {
        expect(() => inst(Bar).parse(new Map())).toThrow();
    })

    it("should error on Set", () => {
        expect(() => inst(Bar).parse(new Set())).toThrow();
    })

    it("should error on WeakMap", () => {
        expect(() => inst(Bar).parse(new WeakMap())).toThrow();
    })

    it("should error on WeakSet", () => {
        expect(() => inst(Bar).parse(new WeakSet())).toThrow();
    })

    it("should error on ArrayBuffer", () => {
        expect(() => inst(Bar).parse(new ArrayBuffer(1))).toThrow();
    })

    it("should error on Int8Array", () => {
        expect(() => inst(Bar).parse(new Int8Array(1))).toThrow();
    })

    it("should error on Uint8Array", () => {
        expect(() => inst(Bar).parse(new Uint8Array(1))).toThrow();
    })

    it("should error on Uint8ClampedArray", () => {
        expect(() => inst(Bar).parse(new Uint8ClampedArray(1))).toThrow();
    })

    it("should error on Int16Array", () => {
        expect(() => inst(Bar).parse(new Int16Array(1))).toThrow();
    })

    it("should error on Uint16Array", () => {
        expect(() => inst(Bar).parse(new Uint16Array(1))).toThrow();
    })

    it("should error on Int32Array", () => {
        expect(() => inst(Bar).parse(new Int32Array(1))).toThrow();
    })

    it("should error on Uint32Array", () => {
        expect(() => inst(Bar).parse(new Uint32Array(1))).toThrow();
    })

    it("should error on Float32Array", () => {
        expect(() => inst(Bar).parse(new Float32Array(1))).toThrow();
    })

    it("should error on Float64Array", () => {
        expect(() => inst(Bar).parse(new Float64Array(1))).toThrow();
    })

    it("should error on BigInt64Array", () => {
        expect(() => inst(Bar).parse(new BigInt64Array(1))).toThrow();
    })

    it("should error on BigUint64Array", () => {
        expect(() => inst(Bar).parse(new BigUint64Array(1))).toThrow();
    })

    it("should parse instance", () => {
        expect(inst(Bar).parse(new Bar())).toEqual(new Bar());
        expect(inst(Bar).parse(new Bar())).toBeInstanceOf(Bar);
    })

    it("should error on instance of another class", () => {
        expect(() => inst(Bar).parse(new Baz())).toThrow();
    })

    it("should error on native enum variant", () => {
        expect(() => inst(Bar).parse(Foo.A)).toThrow();
        expect(() => inst(Bar).parse(Foo.B)).toThrow();
        expect(() => inst(Bar).parse(Foo.C)).toThrow();
        expect(() => inst(Bar).parse(Foo.D)).toThrow();
    })

    it("should error on regex", () => {
        expect(inst(Bar).parse(/./)).toEqual(/./);
    })
});