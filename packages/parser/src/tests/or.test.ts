// import { describe, expect, test, it, expectTypeOf, assertType } from 'vitest'
// import { bool } from '../parsers/BooleanParser.js';
// import { num } from '../parsers/NumberParser.js';
// import { or, union } from '../parsers/UnionParser.js';
// import { str } from '../parsers/StringParser.js';

// describe("or", () => {
//     it("should have correct typename", () => {
//         expect(or(str(), num()).name).toBe(`(${str().name} | ${num().name})`)
//     })
    
//     it("should return union of types", () => {
//         assertType<(value: unknown) => string | number>(or(num(), str()).validate);
//         const parser = or(num(), str());
//         const a: ReturnType<typeof parser.validate> = 1;
//         const b: ReturnType<typeof parser.validate> = "";
//     })

//     it("should parse number or string", () => {
//         expect(or(num(), str()).validate(1)).toBe(1);
//         expect(or(num(), str()).validate("")).toBe("");
//     })

//     it("should error on incorrect type", () => {
//         expect(() => or(num(), str()).validate({})).toThrow();
//         expect(() => or(num(), str()).validate(undefined)).toThrow();
//         expect(() => or(num(), str()).validate(null)).toThrow();
//         expect(() => or(num(), str()).validate([])).toThrow();
//     })
// });