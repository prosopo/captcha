import { describe, expect, test, it } from 'vitest'
import { pString } from '../parsers/StringParser.js';
import { pNumber } from '../parsers/NumberParser.js';


describe("string parsing", () => {
    it("should parse a string", () => {
        expect(pString().parse("hello")).toEqual("hello");
    });

    it("should not parse number as string", () => {
        expect(() => pString().parse(123)).toThrow();
    });

    it("should not parse boolean as string", () => {
        expect(() => pString().parse(true)).toThrow();
    });

    it("should not parse bigint as string", () => {
        expect(() => pString().parse(BigInt(123))).toThrow();
    });

    it("should not parse null as string", () => {
        expect(() => pString().parse(null)).toThrow();
    });

    it("should not parse undefined as string", () => {
        expect(() => pString().parse(undefined)).toThrow();
    });

    it("should coerce number to string", () => {
        expect(pString().parse(123, {
            coerce: true
        })).toEqual("123");
    });

    it("should coerce boolean to string", () => {
        expect(pString().parse(true, {
            coerce: true
        })).toEqual("true");
    });

    it("should coerce bigint to string", () => {
        expect(pString().parse(BigInt(123), {
            coerce: true
        })).toEqual("123");
    });

    it("should coerce null to string", () => {
        expect(pString().parse(null, {
            coerce: true
        })).toEqual("null");
    });

    it("should coerce undefined to string", () => {
        expect(pString().parse(undefined, {
            coerce: true
        })).toEqual("undefined");
    });
});

describe("number parsing", () => {
    it("should parse a number", () => {
        expect(pNumber().parse(123)).toEqual(123);
    });

    it("should not parse string as number", () => {
        expect(() => pNumber().parse("123")).toThrow();
    });

    it("should not parse boolean as number", () => {
        expect(() => pNumber().parse(true)).toThrow();
    });

    it("should not parse bigint as number", () => {
        expect(() => pNumber().parse(BigInt(123))).toThrow();
    });

    it("should not parse null as number", () => {
        expect(() => pNumber().parse(null)).toThrow();
    });

    it("should not parse undefined as number", () => {
        expect(() => pNumber().parse(undefined)).toThrow();
    });

    it("should error on empty string", () => {
        expect(() => pNumber().parse("")).toThrow();
    });

    it("should error when coercing alpha string to number", () => {
        expect(() => pNumber().parse("abc", {
            coerce: true
        })).toThrow();
    });

    it("should coerce string to number", () => {
        expect(pNumber().parse("123", {
            coerce: true
        })).toEqual(123);
    });

    it("should coerce boolean to number", () => {
        expect(pNumber().parse(true, {
            coerce: true
        })).toEqual(1);
    });

    it("should coerce bigint to number", () => {
        expect(pNumber().parse(BigInt(123), {
            coerce: true
        })).toEqual(123);
    });

    it("should coerce null to number", () => {
        expect(pNumber().parse(null, {
            coerce: true
        })).toEqual(0);
    });

    it("should coerce undefined to number", () => {
        expect(pNumber().parse(undefined, {
            coerce: true
        })).toEqual(NaN);
    });
    
})