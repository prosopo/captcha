import { describe, expect, test, it, expectTypeOf } from 'vitest'
import { bool } from '../parsers/BooleanParser.js';
import { num } from '../parsers/NumberParser.js';
import { str } from '../parsers/StringParser.js';
import { intersect } from '../parsers/IntersectParser.js';
import { obj } from '../parsers/ObjectParser.js';

describe("intersect", () => {
    it("should error on no parsers", () => {
        expect(() => intersect([]).parse(null)).toThrow();
    })

    it("should return type never on no parsers", () => {
        expectTypeOf(() => intersect([]).parse(null)).returns.toBeNever();
    })

    it("should return never on intersection of primitive types", () => {
        // number & string & boolean = never
        expectTypeOf(() => intersect([num(), str(), bool()]).parse(null)).returns.toEqualTypeOf<never>();
    })

    it("should return intersection of types", () => {
        // merge objects together
        expectTypeOf(() => intersect([obj({ a: num() }), obj({ b: str() }), obj({ c: bool() })]).parse(null)).returns.toEqualTypeOf<{
            a: number;
            b: string;
            c: boolean;
        }>();
    })

    it("should parse into a single object", () => {
        expect(intersect([obj({ a: num() }), obj({ b: str() }), obj({ c: bool() })]).parse({ a: 1, b: "", c: true })).toEqual({ a: 1, b: "", c: true });
    })

    it("should error on incorrect type", () => {
        expect(() => intersect([obj({ a: num() }), obj({ b: str() }), obj({ c: bool() })]).parse({})).toThrow();
        expect(() => intersect([obj({ a: num() }), obj({ b: str() }), obj({ c: bool() })]).parse(undefined)).toThrow();
        expect(() => intersect([obj({ a: num() }), obj({ b: str() }), obj({ c: bool() })]).parse(null)).toThrow();
        expect(() => intersect([obj({ a: num() }), obj({ b: str() }), obj({ c: bool() })]).parse([])).toThrow();
    })
});