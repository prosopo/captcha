import { describe, expect, test, it, expectTypeOf } from 'vitest'
import { undef } from '../parsers/UndefinedParser.js';
import { voi } from '../parsers/VoidParser.js';
import { bool } from '../parsers/BooleanParser.js';
import { num } from '../parsers/NumberParser.js';
import { obj } from '../parsers/ObjectParser.js';
import { str } from '../parsers/StringParser.js';
import { arr } from '../parsers/ArrayParser.js';
import { tuple } from '../parsers/TupleParser.js';

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

const p = () => obj({
    a: str(),
    b: num(),
    c: bool(),
});

describe("object", () => {
    it("should parse object with correct fields", () => {
        expect(p().parse({a: "a", b: 1, c: true})).toEqual({a: "a", b: 1, c: true});
    })

    it("should error on object with missing fields", () => {
        expect(() => p().parse({a: "a", b: 1})).toThrow();
    })

    it("should error on object with extra fields", () => {
        expect(() => p().parse({a: "a", b: 1, c: true, d: "d"})).toThrow();
    })

    it("should error on object with incorrect field type", () => {
        expect(() => p().parse({a: "a", b: 1, c: 1})).toThrow();
    })

    it("should parse nested object with correct fields", () => {
        const p = obj({
            a: str(),
            b: num(),
            c: obj({
                d: bool(),
                e: str()
            })
        });
        expect(p.parse({a: "a", b: 1, c: {d: true, e: "e"}})).toEqual({a: "a", b: 1, c: {d: true, e: "e"}});
    })

    it("should error on nested object with missing fields", () => {
        const p = obj({
            a: str(),
            b: num(),
            c: obj({
                d: bool(),
                e: str()
            })
        });
        expect(() => p.parse({a: "a", b: 1, c: {d: true}})).toThrow();
    })

    it("should error on nested object with extra fields", () => {
        const p = obj({
            a: str(),
            b: num(),
            c: obj({
                d: bool(),
                e: str()
            })
        });
        expect(() => p.parse({a: "a", b: 1, c: {d: true, e: "e", f: "f"}})).toThrow();
    })

    it("should error on nested object with incorrect field type", () => {
        const p = obj({
            a: str(),
            b: num(),
            c: obj({
                d: bool(),
                e: str()
            })
        });
        expect(() => p.parse({a: "a", b: 1, c: {d: true, e: 1}})).toThrow();
    })

    it("should parse object with array field", () => {
        const p = obj({
            a: str(),
            b: num(),
            c: arr(num())
        });
        expect(p.parse({a: "a", b: 1, c: [1, 2, 3]})).toEqual({a: "a", b: 1, c: [1, 2, 3]});
    })

    it("should error on object with array field with incorrect element type", () => {
        const p = obj({
            a: str(),
            b: num(),
            c: arr(num())
        });
        expect(() => p.parse({a: "a", b: 1, c: [1, 2, "3"]})).toThrow();
    })

    it("should parse object with tuple field", () => {
        const p = obj({
            a: str(),
            b: num(),
            c: tuple([num(), str()])
        });
        expect(p.parse({a: "a", b: 1, c: [1, "2"]})).toEqual({a: "a", b: 1, c: [1, "2"]});
    })

    it("should error on object with tuple field with incorrect element type", () => {
        const p = obj({
            a: str(),
            b: num(),
            c: tuple([num(), str()])
        });
        expect(() => p.parse({a: "a", b: 1, c: [1, 2]})).toThrow();
    })

    // todo
    // type with tuple
    // type with array
    // array of objs
    // tuple of objs
    // intersection in obj
    // union in obj
    // intersection in nested obj
    // union in nested obj
    // deeply nested obj
    // deeply complex obj

    it("should have correct typename", () => {
        expect(p().name).toBe("{\n\ta: string,\n\tb: number,\n\tc: boolean\n}")
    })

    it("should parse to correct type", () => {
        expectTypeOf(() => p().parse(null)).returns.toMatchTypeOf<{
            a: string;
            b: number;
            c: boolean;
        }>();
        const parser = p();
        const a: {a: string, b: number, c: boolean} = {a: "a", b: 1, c: true}
        const b: ReturnType<typeof parser.parse> = a
    })

    it("should parse to correct type with nested object", () => {
        expectTypeOf(() => obj({
            a: str(),
            b: num(),
            c: obj({
                d: bool(),
                e: str()
            })
        }).parse(null)).returns.toMatchTypeOf<{
            a: string;
            b: number;
            c: {
                d: boolean;
                e: string;
            }
        }>();
        const parser = obj({
            a: str(),
            b: num(),
            c: obj({
                d: bool(),
                e: str()
            })
        });
        const a: { a: string, b: number, c: { d: boolean, e: string } } = { a: "a", b: 1, c: { d: true, e: "e" } }
        const b: ReturnType<typeof parser.parse> = a
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

