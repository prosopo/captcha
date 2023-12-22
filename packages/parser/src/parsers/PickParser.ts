// import { Parseable } from "./Parseable.js"
// import { BaseParser, ParseOptions, Parser } from "./Parser.js"

// class PickParser<T extends {}, U extends keyof T> extends BaseParser<Pick<T, U>> {
//     constructor(private schema: Parseable<T>) {
//         super()
//     }

//     override _parse(value: unknown, options?: ParseOptions): Pick<T, U> {
//         // TODO allow optional keys to do picked parsing
//         throw new Error("Method not implemented.")
//     }

//     override validate(value: Pick<T, U>): void {
//         super.validate(value)
//         // TODO allow optional keys to do picked validation
//         throw new Error("Method not implemented.")
//     }
// }

// export const pPick = <T extends {}, U extends keyof T>(schema: Parseable<T>): Parser<Pick<T, U>> => new PickParser(schema)


type A = {
    a: string
    b: number
    c: boolean
    d: {
        e: string
        f: number
        g: boolean
    }
}
type B = {
    a: true,
    b: true,
}

const a1: A = {
    a: 'hello',
    b: 1,
    c: true,
    d: {
        e: 'hello',
        f: 1,
        g: true,
    }
}
type Mask<T> = {
    [K in keyof T]?: boolean | Mask<T[K]>
}
type Masked<T, U extends Mask<T>> = {
    [K in keyof T]: U[K] extends true ? T[K] : U[K] extends Mask<T[K]> ? Masked<T[K], U[K]> : never
}
const f1 = <T, U extends Mask<T>>(input: T, mask: U): Masked<T, U> => {
    return null!
}
const a2 = f1(a1, {
    a: true,
    b: true,
    d: {
        e: true,
        f: true,
    }
})
type T1 = typeof a2
type T2 = typeof a2.d