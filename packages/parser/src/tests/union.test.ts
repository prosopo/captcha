// import { describe, expect, test, it, expectTypeOf, assertType } from 'vitest'
// import { bool } from '../parsers/BooleanParser.js';
// import { num } from '../parsers/NumberParser.js';
// import { or, union } from '../parsers/UnionParser.js';
// import { str } from '../parsers/StringParser.js';

// describe("union", () => {
//     it("should have correct typename", () => {
//         expect(union([num(), str(), bool()]).name).toBe(`(${num().name} | ${str().name} | ${bool().name})`)
//     })

//     it("should error on no parsers", () => {
//         expect(() => union([]).validate(null)).toThrow();
//     })

//     it("should return type never on no parsers", () => {
//         expectTypeOf(() => union([]).validate(null)).returns.toBeNever();
//         const parser = union([]);
//         const a: never = null!
//         const b: ReturnType<typeof parser.validate> = a;
//     })

//     it("should return union of types", () => {
//         assertType<(value: unknown) => number | string | boolean>(union([num(), str(), bool()]).validate)
//         const parser = union([num(), str(), bool()]);
//         const a: number = 1
//         const b: ReturnType<typeof parser.validate> = a;
//         const c: string = ""
//         const d: ReturnType<typeof parser.validate> = c;
//         const e: boolean = true
//         const f: ReturnType<typeof parser.validate> = e;
//     })

//     it("should parse number, string, or boolean", () => {
//         expect(union([num(), str(), bool()]).validate(1)).toBe(1);
//         expect(union([num(), str(), bool()]).validate("")).toBe("");
//         expect(union([num(), str(), bool()]).validate(true)).toBe(true);
//     })

//     it("should error on incorrect type", () => {
//         expect(() => union([num(), str(), bool()]).validate({})).toThrow();
//         expect(() => union([num(), str(), bool()]).validate(undefined)).toThrow();
//         expect(() => union([num(), str(), bool()]).validate(null)).toThrow();
//         expect(() => union([num(), str(), bool()]).validate([])).toThrow();
//     })

//     it("should error on regex", () => {
//         expect(() => union([num(), str(), bool()]).validate(/./)).toThrow();
//     })
// });