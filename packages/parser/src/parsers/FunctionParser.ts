import { Shaper } from "./Parser.js"

// enables parsing at function entry and exit points. I.e. validate the args of a fn and/or the return value of a fn
export class FunctionParser<T extends Shaper<any>[], U> {

    // if there are no args / you do not want to parse the args, then set args to null
    // if there is no return value / you do not want to parse the return value, then set returnType to null
    // both default to null, representing () => void
    constructor(readonly args: T | null = null, readonly returnType: Shaper<U> | null = null) {

    }


}

type UnpackParserArray<T> = T extends [Shaper<infer A>, ...infer B] ? [A, ...UnpackParserArray<B>] : []
type UnpackReturnType<T> = T extends Shaper<infer U> ? U : never
type ToFn<T extends Shaper<any>[], U = void> = (...args: UnpackParserArray<T>) => U

type a1 = ToFn<[Shaper<string>, Shaper<number>]>
type a2 = ToFn<[], string>

// export const pFunction = <T, U>() => new FunctionParser<T, U>()
// export const fn = pFunction

// TODO finish this off