import { Resolve } from "./utils.js"

const pString: () => Parser<string> = null!
const pNumber: () => Parser<number> = null!
const pBoolean: () => Parser<boolean> = null!

// a parser parses an unknown value into a known value of type T, throwing an error if the value is not of type T
export class Parser<T> {
    parse(value: unknown): T {
        throw new Error("Method not implemented.")
    }

    clone(): Parser<T> {
        throw new Error("Method not implemented.")
    }
}

// export type Schema<T extends { [key: string]: any } = {}> = {
//     [K in keyof T]: T[K] extends object ? Schema<T[K]> : Parser<T[K]>
// }

export type Pack<T> = {
    [K in keyof T]: T[K] extends object ? Pack<T[K]> : Parser<T[K]>
}

export type Unpack<T extends Pack<any>> = Resolve<{
    [K in keyof T]: T[K] extends Parser<infer U> ? U : T[K] extends Pack<any> ? Unpack<T[K]> : never
}>

export class ObjectParser<T> extends Parser<T> {
    constructor(private schema: Pack<T>) {
        super()
    }
}

export const pObject = <T extends Pack<any>, U extends Unpack<T>>(schema: T) => new ObjectParser<U>(schema)

const a1 = pObject({
    a: pString(),
    b: pNumber(),
    c: pBoolean(),
})
type a2 = typeof a1
type a3 = ReturnType<typeof a1.parse>
type a4 = {
    a: Parser<string>
    b: Parser<number>
    c: Parser<boolean>
}
type a5 = Unpack<a4>