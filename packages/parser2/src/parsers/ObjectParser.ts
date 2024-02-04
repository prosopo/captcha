import { pBoolean } from "./BooleanParser.js"
import { pNumber } from "./NumberParser.js"
import { FieldParser, FieldOptions, SetFieldOptions, IsRequired, IsReadWrite, IsOptional, IsReadonly } from "./Parser.js"
import { pString } from "./StringParser.js"
import { Resolve } from "./utils.js"

const opt: <T, F extends FieldOptions>(p: FieldParser<T, F>) => FieldParser<T, SetFieldOptions<F, {
    optional: true
}>> = null!
const req: <T, F extends FieldOptions>(p: FieldParser<T, F>) => FieldParser<T, SetFieldOptions<F, {
    optional: false
}>> = null!
const ro: <T, F extends FieldOptions>(p: FieldParser<T, F>) => FieldParser<T, SetFieldOptions<F, {
    readonly: true
}>> = null!
const rw: <T, F extends FieldOptions>(p: FieldParser<T, F>) => FieldParser<T, SetFieldOptions<F, {
    readonly: false
}>> = null!

export type Unpack<T extends Schema<any>> = {
    // required + readwrite keys
    [K in keyof T as IsRequired<T[K]> extends true ? IsReadWrite<T[K]> extends true ? K : never : never]: T[K] extends FieldParser<infer U, any> ? U : T[K] extends Schema<any> ? Unpack<T[K]> : never
} & {
    // optional + readwrite keys
    [K in keyof T as IsOptional<T[K]> extends true ? IsReadWrite<T[K]> extends true ? K : never : never]?: T[K] extends FieldParser<infer U, any> ? U : T[K] extends Schema<any> ? Unpack<T[K]> : never
} & {
    // required + readonly keys
    readonly [K in keyof T as IsRequired<T[K]> extends true ? IsReadonly<T[K]> extends true ? K : never : never]: T[K] extends FieldParser<infer U, any> ? U : T[K] extends Schema<any> ? Unpack<T[K]> : never
} & {
    // optional + readonly keys
    readonly [K in keyof T as IsOptional<T[K]> extends true ? IsReadonly<T[K]> extends true ? K : never : never]?: T[K] extends FieldParser<infer U, any> ? U : T[K] extends Schema<any> ? Unpack<T[K]> : never
}

export type Schema<T> = {
    [K in keyof T]: FieldParser<T[K], any>
}

export class ObjectParser<T> extends FieldParser<Resolve<T>, {
    optional: false
    readonly: false
}> {
    constructor(private schema: Schema<T>) {
        super({
            optional: false,
            readonly: false
        })
    }

    public override parse(value: unknown): Resolve<T> {
        throw new Error("Method not implemented.")
    }    
}

export const pObject = <T extends Schema<any>>(schema: T) => new ObjectParser<Unpack<T>>(schema)
export const obj = pObject

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