import { describe, expect, test, it, expectTypeOf } from 'vitest'
import { undef } from '../parsers/UndefinedParser.js';
import { unknown } from '../parsers/UnknownParser.js';
import { any } from '../parsers/AnyParser.js';

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

const p = any

describe("unknown", () => {
    it("should have correct typename", () => {
        expect(p().name).toBe(`any`)
    })

    it("should parse to correct type", () => {
        expectTypeOf(() => p().shape(null)).returns.toMatchTypeOf<any>();
        const parser = p();
        const a: any = undefined
        const b: ReturnType<typeof parser.shape> = a
    })

    it("should pass-through", () => {
        expect(p().shape(1)).toBe(1);
        expect(p().shape("")).toBe("");
        expect(p().shape({})).toEqual({});
        expect(p().shape([])).toEqual([]);
        expect(p().shape(null)).toBe(null);
        expect(p().shape(undefined)).toBe(undefined);
        expect(p().shape(NaN)).toBe(NaN);
    })

    it("should allow any field lookup on an object", () => {
        const a = p().shape({ a: 1, b: 2, c: 3 });
        expect(a.a).toBe(1);
        expect(a.b).toBe(2);
        expect(a.c).toBe(3);
        expect(a.d).toBe(undefined); // this won't error during compile time if the parser is correct, but will return undefined at runtime
    })

    // haven't tested the normal cases as these should be simple pass-throughs
});