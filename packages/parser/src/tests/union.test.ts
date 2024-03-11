import { describe, expect, test, it, expectTypeOf, assertType } from 'vitest'
import { bool } from '../parsers/BooleanParser.js';
import { num } from '../parsers/NumberParser.js';
import { or, union } from '../parsers/UnionParser.js';
import { str } from '../parsers/StringParser.js';

describe("union", () => {
    it("should error on no parsers", () => {
        expect(() => union([]).parse(null)).toThrow();
    })

    it("should return type never on no parsers", () => {
        expectTypeOf(() => union([]).parse(null)).returns.toBeNever();
        const parser = union([]);
        const a: never = null!
        const b: ReturnType<typeof parser.parse> = a;
    })

    it("should return union of types", () => {
        assertType<(value: unknown) => number | string | boolean>(union([num(), str(), bool()]).parse)
        const parser = union([num(), str(), bool()]);
        const a: number = 1
        const b: ReturnType<typeof parser.parse> = a;
        const c: string = ""
        const d: ReturnType<typeof parser.parse> = c;
        const e: boolean = true
        const f: ReturnType<typeof parser.parse> = e;
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

    it("should error on regex", () => {
        expect(() => union([num(), str(), bool()]).parse(/./)).toThrow();
    })
});