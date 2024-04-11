// import { describe, expect, test, it, expectTypeOf, assertType } from 'vitest'
// import { bool } from '../parsers/BooleanParser.js';
// import { num } from '../parsers/NumberParser.js';
// import { str } from '../parsers/StringParser.js';
// import { intersect } from '../parsers/IntersectParser.js';
// import { obj } from '../parsers/ObjectParser.js';

// describe("intersect", () => {
//     it("should have correct typename", () => {
//         expect(intersect([obj({ a: num() }), obj({ b: str() }), obj({ c: bool() })]).name).toBe(`${obj({ a: num() }).name} & ${obj({ b: str() }).name} & ${obj({ c: bool() }).name}`)
//     })
    
//     it("should error on no parsers", () => {
//         expect(() => intersect([]).validate(null)).toThrow();
//     })

//     it("should return type never on no parsers", () => {
//         expectTypeOf(() => intersect([]).validate(null)).returns.toBeNever();
//         const parser = intersect([]);
//         const a: never = null!
//         const b: ReturnType<typeof parser.validate> = a;
//     })

//     it("should return never on intersection of primitive types", () => {
//         // number & string & boolean = never
//         assertType<(value: unknown) => never>(intersect([num(), str(), bool()]).validate)
//         const parser = intersect([num(), str(), bool()]);
//         const a: never = null!
//         const b: ReturnType<typeof parser.validate> = a;
//     })

//     it("should return intersection of types", () => {
//         // merge objects together
//         assertType<(value: unknown) => { a: number; b: string; c: boolean }>(intersect([obj({ a: num() }), obj({ b: str() }), obj({ c: bool() })]).validate);
//         const parser = intersect([obj({ a: num() }), obj({ b: str() }), obj({ c: bool() })]);
//         const a: { a: number; b: string; c: boolean } = { a: 1, b: "", c: true }
//         const b: ReturnType<typeof parser.validate> = a;
//     })

//     it("should parse into a single object", () => {
//         expect(intersect([obj({ a: num() }), obj({ b: str() }), obj({ c: bool() })]).validate({ a: 1, b: "", c: true })).toEqual({ a: 1, b: "", c: true });
//     })

//     it("should error on incorrect type", () => {
//         expect(() => intersect([obj({ a: num() }), obj({ b: str() }), obj({ c: bool() })]).validate({})).toThrow();
//         expect(() => intersect([obj({ a: num() }), obj({ b: str() }), obj({ c: bool() })]).validate(undefined)).toThrow();
//         expect(() => intersect([obj({ a: num() }), obj({ b: str() }), obj({ c: bool() })]).validate(null)).toThrow();
//         expect(() => intersect([obj({ a: num() }), obj({ b: str() }), obj({ c: bool() })]).validate([])).toThrow();
//     })
// });