import { describe, expect, test, it, expectTypeOf } from 'vitest'
import { bool } from '../parsers/BooleanParser.js';
import { num } from '../parsers/NumberParser.js';
import { or } from '../parsers/OrParser.js';
import { str } from '../parsers/StringParser.js';

describe("or", () => {
    it("should error on no parsers", () => {
        expect(() => or([]).parse(null)).toThrow();
    })

    it("should return type never on no parsers", () => {
        expectTypeOf(() => or([]).parse(null)).returns.toBeNever();
    })

    it("should return union of types", () => {
        expectTypeOf(() => or([num(), str(), bool()]).parse(null)).returns.toEqualTypeOf<number | string | boolean>();
    })

    it("should parse number, string, or boolean", () => {
        expect(or([num(), str(), bool()]).parse(1)).toBe(1);
        expect(or([num(), str(), bool()]).parse("")).toBe("");
        expect(or([num(), str(), bool()]).parse(true)).toBe(true);
    })

    it("should error on incorrect type", () => {
        expect(() => or([num(), str(), bool()]).parse({})).toThrow();
        expect(() => or([num(), str(), bool()]).parse(undefined)).toThrow();
        expect(() => or([num(), str(), bool()]).parse(null)).toThrow();
        expect(() => or([num(), str(), bool()]).parse([])).toThrow();
    })
});