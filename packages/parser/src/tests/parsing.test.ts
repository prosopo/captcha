import { describe, expect, test } from 'vitest'
// import { pString } from '../parsers/StringParser.js';
// import { pNumber } from '../parsers/NumberParser.js';
// import { pBigInt } from '../parsers/BigIntParser.js';
import { pBoolean } from '../parsers/BooleanParser.js';

// describe("bigint", () => {
//     test("parses", () => {
//         expect(() => pBigInt().parse(undefined)).to.throw();
//         expect(() => pBigInt().parse(null)).to.throw();
//         expect(() => pBigInt().parse("")).to.throw();
//         expect(() => pBigInt().parse(true)).to.throw();
//         expect(() => pBigInt().parse(123)).to.throw();
//         expect(pBigInt().parse(BigInt(456))).to.equal(BigInt(456));
//         expect(() => pBigInt().parse("hello")).to.throw();
//         expect(() => pBigInt().parse("789")).to.throw();
//         expect(() => pBigInt().parse("hello123")).to.throw();
//     });

//     test("coerces", () => {
//         expect(() => pBigInt().parse(undefined, { coerce: true })).to.throw();
//         expect(() => pBigInt().parse(null, { coerce: true })).to.throw();
//         expect(pBigInt().parse("", { coerce: true })).to.equal(0n);
//         expect(pBigInt().parse(true, { coerce: true })).to.equal(0n);
//         expect(pBigInt().parse(false, { coerce: true })).to.equal(0n);
//         expect(pBigInt().parse(BigInt(456), { coerce: true })).to.equal(BigInt(456));
//         expect(() => pBigInt().parse("hello", { coerce: true })).to.throw(); // not numeric
//         expect(pBigInt().parse("789", { coerce: true })).to.equal(BigInt(789));
//         expect(() => pBigInt().parse("hello123", { coerce: true })).to.throw(); // not numeric
//     })
// })

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

    test("coerces", () => {
        expect(pBoolean().parse(undefined, { coerce: true })).to.equal(false);
        expect(pBoolean().parse(null, { coerce: true })).to.equal(false);
        expect(pBoolean().parse("", { coerce: true })).to.equal(false);
        expect(pBoolean().parse(true, { coerce: true })).to.equal(true);
        expect(pBoolean().parse(false, { coerce: true })).to.equal(false);
        expect(pBoolean().parse(BigInt(456), { coerce: true })).to.equal(true);
        expect(pBoolean().parse(BigInt(0), { coerce: true })).to.equal(false);
        expect(pBoolean().parse("hello", { coerce: true })).to.equal(true);
        expect(pBoolean().parse("789", { coerce: true })).to.equal(true);
        expect(pBoolean().parse("hello123", { coerce: true })).to.equal(true);
    })
})

// describe("string", () => {
//     test("parses", () => {
//         expect(() => pString().parse(undefined)).to.throw();
//         expect(() => pString().parse(null)).to.throw();
//         expect(pString().parse("")).to.equal("");
//         expect(() => pString().parse(true)).to.throw();
//         expect(() => pString().parse(123)).to.throw();
//         expect(() => pString().parse(BigInt(456))).to.throw();
//         expect(pString().parse("hello")).to.equal("hello");
//         expect(pString().parse("789")).to.equal("789");
//         expect(pString().parse("hello123")).to.equal("hello123");
//     });

//     test("coerces", () => {
//         expect(pString().parse(undefined, { coerce: true })).to.equal("undefined");
//         expect(pString().parse(null, { coerce: true })).to.equal("null");
//         expect(pString().parse("", { coerce: true })).to.equal("");
//         expect(pString().parse(true, { coerce: true })).to.equal("true");
//         expect(pString().parse(false, { coerce: true })).to.equal("false");
//         expect(pString().parse(BigInt(456), { coerce: true })).to.equal("456");
//         expect(pString().parse(BigInt("1234567890123456789012345678901234567890"), { coerce: true })).to.equal("1234567890123456789012345678901234567890"); // too big
//         expect(pString().parse("hello", { coerce: true })).to.equal("hello");
//         expect(pString().parse("789", { coerce: true })).to.equal("789");
//         expect(pString().parse("hello123", { coerce: true })).to.equal("hello123");
//     })
// })

// describe("number", () => {
//     test("parses", () => {
//         expect(() => pNumber().parse(undefined)).to.throw();
//         expect(() => pNumber().parse(null)).to.throw();
//         expect(() => pNumber().parse("")).to.throw();
//         expect(() => pNumber().parse(true)).to.throw();
//         expect(pNumber().parse(123)).to.equal(123);
//         expect(() => pNumber().parse(BigInt(456))).to.throw();
//         expect(() => pNumber().parse("hello")).to.throw();
//         expect(() => pNumber().parse("789")).to.throw();
//         expect(() => pNumber().parse("hello123")).to.throw();
//     });

//     test("coerces", () => {
//         expect(pNumber().parse(undefined, { coerce: true })).to.equal(NaN);
//         expect(pNumber().parse(null, { coerce: true })).to.equal(0);
//         expect(pNumber().parse("", { coerce: true })).to.equal(0);
//         expect(pNumber().parse(true, { coerce: true })).to.equal(1);
//         expect(pNumber().parse(false, { coerce: true })).to.equal(0);
//         expect(pNumber().parse(BigInt(456), { coerce: true })).to.equal(456);
//         expect(pNumber().parse("hello", { coerce: true })).to.equal(NaN); // not numeric
//         expect(pNumber().parse("789", { coerce: true })).to.equal(789);
//         expect(pNumber().parse("hello123", { coerce: true })).to.equal(NaN); // not numeric
//     })
// })
