import { describe, expect, test } from 'vitest'
import { pString } from '../parsers/StringParser.js';
import { pNumber } from '../parsers/NumberParser.js';
import { pBigInt } from '../parsers/BigIntParser.js';
import { pBoolean } from '../parsers/BooleanParser.js';

describe("bigint", () => {
    test("parses", () => {
        expect(() => pBigInt().parse(undefined)).to.throw();
        expect(() => pBigInt().parse(null)).to.throw();
        expect(() => pBigInt().parse("")).to.throw();
        expect(() => pBigInt().parse(true)).to.throw();
        expect(() => pBigInt().parse(123)).to.throw();
        expect(pBigInt().parse(BigInt(456))).to.equal(BigInt(456));
        expect(() => pBigInt().parse("hello")).to.throw();
        expect(() => pBigInt().parse("789")).to.throw();
        expect(() => pBigInt().parse("hello123")).to.throw();
    });
})

describe("boolean", () => {
    test("parses", () => {
        expect(() => pBoolean().parse(undefined)).to.throw();
        expect(() => pBoolean().parse(null)).to.throw();
        expect(() => pBoolean().parse("")).to.throw();
        expect(pBoolean().parse(true)).to.equal(true);
        expect(() => pBoolean().parse(123)).to.throw();
        expect(() => pBoolean().parse(BigInt(456))).to.throw();
        expect(() => pBoolean().parse("hello")).to.throw();
        expect(() => pBoolean().parse("789")).to.throw();
        expect(() => pBoolean().parse("hello123")).to.throw();
    });
})

describe("string", () => {
    test("parses", () => {
        expect(() => pString().parse(undefined)).to.throw();
        expect(() => pString().parse(null)).to.throw();
        expect(pString().parse("")).to.equal("");
        expect(() => pString().parse(true)).to.throw();
        expect(() => pString().parse(123)).to.throw();
        expect(() => pString().parse(BigInt(456))).to.throw();
        expect(pString().parse("hello")).to.equal("hello");
        expect(pString().parse("789")).to.equal("789");
        expect(pString().parse("hello123")).to.equal("hello123");
    });
})

describe("number", () => {
    test("parses", () => {
        expect(() => pNumber().parse(undefined)).to.throw();
        expect(() => pNumber().parse(null)).to.throw();
        expect(() => pNumber().parse("")).to.throw();
        expect(() => pNumber().parse(true)).to.throw();
        expect(pNumber().parse(123)).to.equal(123);
        expect(() => pNumber().parse(BigInt(456))).to.throw();
        expect(() => pNumber().parse("hello")).to.throw();
        expect(() => pNumber().parse("789")).to.throw();
        expect(() => pNumber().parse("hello123")).to.throw();
    });
})
