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

export type Mask<T> = {
    [K in keyof T]?: T[K] extends object ? Mask<T[K]> : any;
};

export type DeepPick<T, U extends Mask<T>> = Resolve<{
    [K in keyof T & keyof U]: U[K] extends object ? DeepPick<T[K], U[K]> : T[K];
}>

export type DeepOmit<T, U extends Mask<T>> = Resolve<{
    [K in keyof T as K extends keyof U ? U[K] extends object ? K : never : K]: U[K] extends object ? DeepOmit<T[K], U[K]> : T[K];
}>

export type Extend<T, U> = Resolve<{
    // all keys in T except those in U
    [K in keyof T as K extends keyof U ? never : K]: K extends keyof U ? never : T[K];
} & {
    // all keys in U, replacing any duplicate keys in T
    [K in keyof U]: U[K];
}>