import { any } from "webidl-conversions";
import { pBoolean } from "./BooleanParser.js";
import { pNumber } from "./NumberParser.js";
import { BaseParser, Parser } from "./Parser.js";
import { pString } from "./StringParser.js";
import { pObject } from "./ObjectParser.js";

type UnionToIntersection<T> = (T extends any ? ((x: T) => 0) : never) extends ((x: infer R) => 0) ? R : never

type ParserArrayIntersection<T> = T extends readonly Parser<(infer U)>[] ? UnionToIntersection<U> : never;

class IntersectionParser<T extends readonly Parser<any>[]> extends BaseParser<ParserArrayIntersection<T>> {
    constructor(private parsers: T) {
        super()
    }

    override _parse(value: unknown): ParserArrayIntersection<T> {
        // the output type is the intersection of the input types, e.g. if the input types are:
        // [Parser<{ a: string }>, Parser<{ b: number }>]
        // then the output type is:
        // { a: string } & { b: number }
        
        // TODO
        throw new Error("Method not implemented.")
    }
}

export const pIntersect = <const T extends readonly Parser<any>[]>(arr: T): IntersectionParser<T> => {
    return new IntersectionParser(arr)
}

// // Example usage:
// type A = { a: string };
// type B = { b: number };
// const aa: Parser<A> = null!;
// const bb: Parser<B> = null!;
// const typesArray = [aa, bb] as const;
// type T = typeof typesArray;

// const f2 = pIntersect([aa, bb])
// const f3 = pIntersect([pObject({
//     a: pString(),
// }), pObject({
//     b: pNumber(),
// })])