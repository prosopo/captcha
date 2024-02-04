import { ValueParser } from "./Parser.js";


export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;


// resolve a typescript type, e.g. if a type is {
//     a: string,
//     b: MyOtherType<blah>
// }
// then Resolve<MyType> will be {
//     a: string,
//     b: {
//         c: string, // say these are the fields for MyOtherType
//         d: string,
//     }
// }
// thus we have resolved the type into a plain object, no nested types
export type Resolve<T> = T extends Function ? T : { [K in keyof T]: T[K] };

export class Cloneable<T> {
    public clone(): T {
        throw new Error("clone() not implemented");
    }
}