import { describe, expect, test, it, expectTypeOf } from 'vitest'
import { bool } from '../parsers/BooleanParser.js';
import { num } from '../parsers/NumberParser.js';
import { or, union } from '../parsers/UnionParser.js';
import { str } from '../parsers/StringParser.js';

describe("or", () => {
    it("should return union of types", () => {
        expectTypeOf(() => or(num(), str()).parse(null)).returns.toEqualTypeOf<number | string>();
    })

    it("should parse number or string", () => {
        expect(or(num(), str()).parse(1)).toBe(1);
        expect(or(num(), str()).parse("")).toBe("");
    })

    it("should error on incorrect type", () => {
        expect(() => or(num(), str()).parse({})).toThrow();
        expect(() => or(num(), str()).parse(undefined)).toThrow();
        expect(() => or(num(), str()).parse(null)).toThrow();
        expect(() => or(num(), str()).parse([])).toThrow();
    })
});