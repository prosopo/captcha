import { any } from "webidl-conversions";
import { pBoolean } from "./BooleanParser.js";
import { pNumber } from "./NumberParser.js";
import { BaseParser, Parser } from "./Parser.js";
import { pString } from "./StringParser.js";
import { pObject } from "./ObjectParser.js";

class IntersectionParser<T, U> extends BaseParser<T & U> {

    constructor(
        private firstParser: Parser<T>,
        private secondParser: Parser<U>,
    ) {
        super()
    }

    override _parse(value: unknown): T & U {
        const firstValue = this.firstParser.parse(value)
        const secondValue = this.secondParser.parse(value)
        return value as T & U
    }
}

type UnionToIntersection<T> = (T extends any ? ((x: T) => 0) : never) extends ((x: infer R) => 0) ? R : never
type ParserArrayElement<T> = T extends Parser<infer U>[] ? U : never
type IntersectArray<T> = T extends Parser<(infer U)>[] ? UnionToIntersection<U> : never
type ParserOutput<T> = T extends Parser<infer U>[] ? U : never

// changes an array of parsers, e.g. (NumberParser | StringParser)[] to a parser array targeted at the output of the parsers, e.g. (number | string)[]
type ParserArray<T> = T extends Parser<infer U>[] ? Parser<U>[] : never

export const convert = <T, U extends Parser<T>[]>(arr: U): Parser<ParserOutput<U>>[] => {
    return null!
}
export const unionToIntersection = <T>(value: T): UnionToIntersection<T> => {
    return null!
}
export const intersect = <T, U extends Parser<T>[]>(arr: U) => {
    const parsers = convert(arr)
    const intersection = unionToIntersection(parsers)
}

type ParserIntersection<T> = T extends Parser<infer U>[] ? UnionToIntersection<U> : never
export const stage1 = <T, U extends Parser<T>[]>(arr: U): ParserOutput<U> => {
    return null!
}
export const stage2 = <T>(arr: T): T extends any ? (x: T) => void : never => {
    return null!
}
export const stage2_2 = <T>(arr: T): (T extends any ? (x: T) => void : never) extends ((x: infer I) => void) ? I : never => {
    return null!
}

type UnionToIntersection2<T> = (T extends any
    ? (x: T) => void
    : never) extends (x: infer I) => void
    ? I
    : never

export const thing = <T>(arr: T): T extends Parser<infer U>[]
    ? (x: U) => void
    : never => {
    return null!
}

type ParserArrayConvert<T> = {
    [K in keyof T]: T[K] extends Parser<infer U> ? (x: U) => void : never
}

const x3 = <const U, const T extends readonly Parser<U>[]>(arr: T): ParserArrayConvert<T> => {
    return null!
}
const x5 = <const U, const T extends readonly Parser<U>[]>(arr: T): ParserArrayConvert<T> extends readonly (infer U)[] ? U : never => {
    return null!
}

type UnionToIntersection3<U> = [U] extends [infer I] ? I : never

const x4 = x3([pString(), pNumber()])
const x6 = x5([pString(), pNumber()])
type x7 = UnionToIntersection3<string | number>

export const thing2 = <T>(arr: T): T extends ((x: infer I) => void) ? I : never => {
    return null!
}

// const a1 = intersect([pString(), pNumber()])
// const a2 = intersect2([pString(), pNumber()])
const a3 = stage1([pString(), pNumber()])
const a4 = stage2(a3)
const a4_2 = stage2_2(a3)
const b1 = thing([pString(), pNumber()])
type t1 = ((x: string) => void) | ((x: number) => void)
const x1: t1 = (x: number) => { }
const b2 = thing2(x1)


type UnionToIntersection4<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

// type IntersectionFromArray<T extends readonly any[]> =
//   T extends [] ? never :
//   T extends [infer Head, ...infer Tail] ? Head & IntersectionFromArray<Tail> :
//   never;


// type IntersectionFromArray<T> = T extends readonly (infer U)[] ? UnionToIntersection<U> : never;

// // Example usage:
// type A = { a: string };
// type B = { b: number };
// const aa: A = { a: "a" };
// const bb: B = { b: 1 };
// const typesArray = [aa, bb] as const;
// type T = typeof typesArray;

// type ResultIntersection = IntersectionFromArray<T>;


// type IntersectionFromArray<T> = T extends readonly Parser<(infer U)>[] ? Parser<UnionToIntersection<U>> : never;

// // Example usage:
// type A = { a: string };
// type B = { b: number };
// const aa: Parser<A> = null!;
// const bb: Parser<B> = null!;
// const typesArray = [aa, bb] as const;
// type T = typeof typesArray;

// type ResultIntersection = IntersectionFromArray<T>;


type IntersectionFromArray<T> = T extends readonly Parser<(infer U)>[] ? Parser<UnionToIntersection<U>> : never;

// Example usage:
type A = { a: string };
type B = { b: number };
const aa: Parser<A> = null!;
const bb: Parser<B> = null!;
const typesArray = [aa, bb] as const;
type T = typeof typesArray;

const f1 = <const T extends readonly Parser<any>[]>(arr: T): IntersectionFromArray<T> => {
    return null!
}
const f2 = f1([aa, bb])
const f3 = f1([pObject({
    a: pString(),
}), pObject({
    b: pNumber(),
})])