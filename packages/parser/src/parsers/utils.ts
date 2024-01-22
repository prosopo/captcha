import { Parser } from "./Parser.js";

export type Mask<T> = {
    [K in keyof T]?: any
}

export type Infer<T> = T extends infer U ? {
    [K in keyof U]: U[K]
} : never

export type PickMask<T, U> = {
    [K in keyof U & keyof T]: U[K] extends Mask<T[K]> ? Infer<PickMask<T[K], U[K]>> : T[K]
}

export type OmitMask<T, U extends Mask<T>> = {
    [K in keyof T as K extends keyof U ? U[K] extends object ? K : never : K]: U[K] extends Mask<T[K]> ? Infer<OmitMask<T[K], U[K]>> : T[K]
}

export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

export type Schema = {
    [key: string]: Parser<any>
}

export type Shape<T extends Schema> = {
    [K in keyof T]: T[K] extends Parser<infer U> ? U : never
}