import { describe, expect, test, it, expectTypeOf } from 'vitest'
import { undef } from '../parsers/UndefinedParser.js';
import { unknown } from '../parsers/UnknownParser.js';

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

describe("unknown", () => {
    it("should have correct typename", () => {
        expect(unknown().name).toBe("unknown")
    })

    it("should parse to correct type", () => {
        expectTypeOf(() => unknown().validate(null)).returns.toMatchTypeOf<unknown>();
        const parser = unknown();
        const a: unknown = undefined
        const b: ReturnType<typeof parser.validate> = a
    })

    it("should pass-through", () => {
        expect(unknown().validate(1)).toBe(1);
        expect(unknown().validate("")).toBe("");
        expect(unknown().validate({})).toEqual({});
        expect(unknown().validate([])).toEqual([]);
        expect(unknown().validate(null)).toBe(null);
        expect(unknown().validate(undefined)).toBe(undefined);
        expect(unknown().validate(NaN)).toBe(NaN);
    })

    // haven't tested the normal cases as these should be simple pass-throughs
});