import { describe, expect, test, it, expectTypeOf } from 'vitest'
import { bool } from '../parsers/BooleanParser.js';
import { num } from '../parsers/NumberParser.js';
import { or, union } from '../parsers/OrParser.js';
import { str } from '../parsers/StringParser.js';

describe("union", () => {
    it("should error on no parsers", () => {
        expect(() => union([]).parse(null)).toThrow();
    })

    it("should return type never on no parsers", () => {
        expectTypeOf(() => union([]).parse(null)).returns.toBeNever();
    })

    it("should return union of types", () => {
        expectTypeOf(() => union([num(), str(), bool()]).parse(null)).returns.toEqualTypeOf<number | string | boolean>();
    })

    it("should parse number, string, or boolean", () => {
        expect(union([num(), str(), bool()]).parse(1)).toBe(1);
        expect(union([num(), str(), bool()]).parse("")).toBe("");
        expect(union([num(), str(), bool()]).parse(true)).toBe(true);
    })

    it("should error on incorrect type", () => {
        expect(() => union([num(), str(), bool()]).parse({})).toThrow();
        expect(() => union([num(), str(), bool()]).parse(undefined)).toThrow();
        expect(() => union([num(), str(), bool()]).parse(null)).toThrow();
        expect(() => union([num(), str(), bool()]).parse([])).toThrow();
    })
});