import { Resolve } from "./utils.js"

const pString: () => Parser<string> = null!
const pNumber: () => Parser<number> = null!
const pBoolean: () => Parser<boolean> = null!
const opt: <T, F extends FieldOptions>(p: Parser<T, F>) => Parser<T, SetFieldOptions<F, {
    optional: true
}>> = null!
const req: <T, F extends FieldOptions>(p: Parser<T, F>) => Parser<T, SetFieldOptions<F, {
    optional: false
}>> = null!
const ro: <T, F extends FieldOptions>(p: Parser<T, F>) => Parser<T, SetFieldOptions<F, {
    readonly: true
}>> = null!
const rw: <T, F extends FieldOptions>(p: Parser<T, F>) => Parser<T, SetFieldOptions<F, {
    readonly: false
}>> = null!

export type FieldOptions = {
    optional: boolean // mark the field as optional in an object
    readonly: boolean // mark the field as readonly in an object
}
export type SetFieldOptions<T extends FieldOptions, U extends Partial<FieldOptions>> = Resolve<{
    optional: undefined extends U["optional"] ? T["optional"] : U["optional"]
    readonly: undefined extends U["readonly"] ? T["readonly"] : U["readonly"]
}>

// a parser parses an unknown value into a known value of type T, throwing an error if the value is not of type T
export class Parser<T, F extends FieldOptions = {
    optional: false
    readonly: false
}> {
    constructor(private options: F) { }

    parse(value: unknown): T {
        
        throw new Error("Method not implemented.")
    }

    clone(): Parser<T> {
        throw new Error("Method not implemented.")
    }
}

export type IsOptional<T> = T extends Parser<any, infer F> ? F extends { optional: true } ? true : false : never
export type IsRequired<T> = T extends Parser<any, infer F> ? F extends { optional: false } ? true : false : never
export type IsReadonly<T> = T extends Parser<any, infer F> ? F extends { readonly: true } ? true : false : never
export type IsReadWrite<T> = T extends Parser<any, infer F> ? F extends { readonly: false } ? true : false : never

export type Unpack<T extends Schema<any>> = {
    // required + readwrite keys
    [K in keyof T as IsRequired<T[K]> extends true ? IsReadWrite<T[K]> extends true ? K : never : never]: T[K] extends Parser<infer U, any> ? U : T[K] extends Schema<any> ? Unpack<T[K]> : never
} & {
    // optional + readwrite keys
    [K in keyof T as IsOptional<T[K]> extends true ? IsReadWrite<T[K]> extends true ? K : never : never]?: T[K] extends Parser<infer U, any> ? U : T[K] extends Schema<any> ? Unpack<T[K]> : never
} & {
    // required + readonly keys
    readonly [K in keyof T as IsRequired<T[K]> extends true ? IsReadonly<T[K]> extends true ? K : never : never]: T[K] extends Parser<infer U, any> ? U : T[K] extends Schema<any> ? Unpack<T[K]> : never
} & {
    // optional + readonly keys
    readonly [K in keyof T as IsOptional<T[K]> extends true ? IsReadonly<T[K]> extends true ? K : never : never]?: T[K] extends Parser<infer U, any> ? U : T[K] extends Schema<any> ? Unpack<T[K]> : never
}

type Schema<T> = {
    [K in keyof T]: Parser<T[K], any>
}

export class ObjectParser<T> extends Parser<Resolve<T>, {
    optional: false
    readonly: false
}> {
    constructor(private schema: Schema<T>) {
        super({
            optional: false,
            readonly: false
        })
    }
}

export const pObject = <T extends Schema<any>>(schema: T) => new ObjectParser<Unpack<T>>(schema)

const a1 = pObject({
    a: pString(),
    b: pNumber(),
    c: pBoolean(),
    d: pObject({
        e: pString(),
        f: pNumber(),
        x1: opt(pString()),
        x2: req(pString()),
        x3: ro(pString()),
        x4: rw(pString()),
        x5: opt(req(pString())),
        x6: req(opt(pString())),
        x7: rw(ro(pString())),
        x8: ro(rw(pString())),
        x9: rw(opt(pString())),
        x10: rw(req(pString())),
        x11: ro(opt(pString())),
        x12: ro(req(pString())),
        x13: req(rw(pString())),
        x14: opt(rw(pString())),
        x15: opt(ro(pString())),
        x16: req(ro(pString())),
    }),
    x1: opt(pString()),
    x2: req(pString()),
    x3: ro(pString()),
    x4: rw(pString()),
    x5: opt(req(pString())),
    x6: req(opt(pString())),
    x7: rw(ro(pString())),
    x8: ro(rw(pString())),
    x9: rw(opt(pString())),
    x10: rw(req(pString())),
    x11: ro(opt(pString())),
    x12: ro(req(pString())),
    x13: req(rw(pString())),
    x14: opt(rw(pString())),
    x15: opt(ro(pString())),
    x16: req(ro(pString())),
})
type a2 = typeof a1
type a3 = ReturnType<typeof a1.parse>

type b1 = SetFieldOptions<{
    optional: true,
    readonly: false
}, {
    readonly: true
    }>
type b2 = SetFieldOptions<{
    optional: false,
    readonly: true
}, {
    optional: true
    }>