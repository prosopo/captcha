
export type UnionToIntersection<U> = Resolve<(U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? ({} extends I ? never : I) : never>


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

export type Ctor<T> = new (...args: any[]) => T

export type InferTypeFromCtor<T extends Ctor<unknown>> = T extends Ctor<infer U> ? U : never

export abstract class Cloneable<T> {
    public abstract clone(): T
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

export type Prop<T, U> = U extends keyof T ? U : never

export type First<T> = T extends readonly [] ? never : T extends readonly [infer U] ? U : T extends readonly [infer U, ...unknown[]] ? U : T extends [] ? never : T extends [infer U] ? U : T extends [infer U, ...unknown[]] ? U : never

export type Last<T> = T extends readonly [] ? never : T extends readonly [infer U] ? U : T extends readonly [unknown, ...infer V] ? Last<V> : T extends [] ? never : T extends [infer U] ? U : T extends [infer U, ...infer V] ? Last<V> : never

export const keys = <T extends object>(obj: T): (keyof T)[] => {
    return Object.keys(obj) as (keyof T)[];
}

export const values = <T extends object>(obj: T): T[keyof T][] => {
    return Object.values(obj) as T[keyof T][];
}

export const entries = <T extends object>(obj: T): [keyof T, T[keyof T]][] => {
    return Object.entries(obj) as [keyof T, T[keyof T]][];
}

export const map = <T extends object, U>(obj: T, fn: (value: T[keyof T], key: keyof T) => U): {
    [K in keyof T]: U
} => {
    const result: any = {}
    for (const key of keys(obj)) {
        result[key] = fn(obj[key], key)
    }
    return result
}

export const stringify = (value: unknown): string => {
    return JSON.stringify(value, (key, value) => {
        // convert bigints to strings, JSON cannot handle them natively
        typeof value === 'bigint' ? value.toString() : value
    }, 2)
}

export function toCamelCase(str: string): string {
    return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
        return index === 0 ? word.toLowerCase() : word.toUpperCase();
    }).replace(/\s+/g, '').replace(/-/g, '');
}

export function removeSuffix(inputString: string, suffix: string): string {
    if (inputString.endsWith(suffix)) {
        return inputString.slice(0, -suffix.length);
    }
    return inputString;
}

export function aRun<T>(fn: () => Promise<T>): Promise<{
    ok: true,
    result: T,
} | {
    ok: false,
    result: Error,
}> {
    return fn().then(result => ({
        ok: true as true,
        result,
    })).catch(e => ({
        ok: false as false,
        result: e instanceof Error ? e : new Error(String(e)),
    }))
}

export function run<T>(fn: () => T): {
    ok: true,
    result: T,
} | {
    ok: false,
    result: Error,
} {
    try {
        return {
            ok: true,
            result: fn(),
        }
    } catch (e) {
        return {
            ok: false,
            result: e instanceof Error ? e : new Error(String(e)),
        }
    }
}

/**
 * Test whether types are equal.
 * 
 * Returns true if T === U, false otherwise.
 */
export type Eq<T, U> = T extends U ? (U extends T ? true : false) : false;
export type EmptyArrays<T, U> = T extends [] ? U extends [] ? true : false : false;
export type EqArray<T, U> = EmptyArrays<T, U> extends true ? true : T extends [infer V1, ...infer R1] ? U extends [infer V2, ...infer R2] ? Eq<V1, V2> extends true ? EqArray<R1, R2> : false : false : false
export type EqMany<T> = T extends [] ? true : T extends [unknown] ? true : T extends [infer A, infer B, ...infer R] ? Eq<A, B> extends true ? EqMany<[B, ...R]> : false : false;

type a = Eq<number, number>
type b = Eq<number, string>
class A { }
class B extends A { x = 1 }
class C { }
type c = Eq<A, B>
type d = Eq<A, C>
type e = Eq<B, A>

type f = EqArray<[1, 2, 3], [1, 2, 3]>
type g = EqArray<[1, 2, 3], [1, 2, 4]>
type h = EqArray<[1, 2, 3], [1, 2]>
type i = EqArray<[1, 2, 3], [1, 2, 3, 4]>
type j = EqArray<[], []>

type k = EqMany<[1, 1, 1]>
type l = EqMany<[1, 2, 3]>
type m = EqMany<[1, 1, 2]>
type n = EqMany<[]>
type o = EqMany<[1]>
type p = EqMany<[1, 2]>
type q = EqMany<[1, 1]>