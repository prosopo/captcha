import { bool, pBoolean } from "./BooleanParser.js"
import { num, pNumber } from "./NumberParser.js"
import { opt } from "./OptionalParser.js"
import { FieldParser, FieldOptions, SetFieldOptions, IsRequired, IsReadWrite, IsOptional, IsReadonly } from "./Parser.js"
import { rw } from "./ReadWriteParser.js"
import { ro } from "./ReadonlyParser.js"
import { req } from "./RequiredParser.js"
import { pString, str } from "./StringParser.js"
import { DeepOmit, DeepPick, Extend, Mask, Resolve } from "./utils.js"

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

export class SchemaHandler<T> {
    constructor(private schema: Schema<T>) {}

    public clone(): Schema<T> {
        const schema: any = {}
        for (const key in this.schema) {
            schema[key] = this.schema[key].clone()
        }
        return schema
    }

    public extend<U>(schema: Schema<U>): Schema<Extend<T, U>> {
        const result: any = {}
        for (const key in this.schema) {
            result[key] = this.schema[key].clone()
        }
        for (const key in schema) {
            result[key] = schema[key].clone()
        }
        return result
    }

    public pick<U extends Mask<T>>(mask: U): Schema<DeepPick<T, U>> {
        const result: any = {}
        for (const key in mask) {
            const parser = (this.schema as any)[key]
            if (parser === undefined) {
                throw new Error(`Parser is undefined, expected valid parser for deep pick`)
            }
            result[key] = parser.clone()
        }
        return result
    }

    public omit<U extends Mask<T>>(mask: U): Schema<DeepOmit<T, U>> {
        const result: any = {}
        for (const key in this.schema) {
            if (mask[key] === undefined) {
                const parser = (this.schema as any)[key]
                if (parser === undefined) {
                    throw new Error(`Parser is undefined, expected valid parser for deep omit`)
                }
                result[key] = parser.clone()
            }
        }
        return result
    }
}

export class ObjectParser<T> extends FieldParser<Resolve<T>, {
    optional: false
    readonly: false
}> {
    constructor(private _schema: Schema<T>) {
        super({
            optional: false,
            readonly: false
        })
        // clone the schema to avoid external modification
        this._schema = new SchemaHandler(_schema).clone()
    }

    public get schema(): Schema<T> {
        // any time the schema is used, clone it. This makes it immutable from internal and external modification, unless using the this._schema property directly
        // this ensures no accidental modification of the schema whatsoever, as a cloned version is always maintained internally
        return new SchemaHandler(this._schema).clone()
    }

    public override parse(value: unknown): Resolve<T> {
        if (typeof value !== "object" || value === null) {
            throw new Error(`Expected an object but got ${JSON.stringify(value)} of type ${JSON.stringify(typeof value)}`)
        }
        const valueObj = value as Record<string, unknown>
        const result: any = {}
        for (const key in this._schema) {
            const parser = this.schema[key]
            const fieldValue = valueObj[key]
            result[key] = parser.parse(fieldValue)
        }
        // TODO handle extra keys, drop/keep?
        // TODO strict mode, i.e. throw an error if there are extra keys
        // TODO inplace / clone to new object
        return result
    }

    public pick<U extends Mask<T>>(mask: U) {
        return new ObjectParser<DeepPick<T, U>>(new SchemaHandler(this.schema).pick(mask))
    }

    public omit<U extends Mask<T>>(mask: U) {
        return new ObjectParser<DeepOmit<T, U>>(new SchemaHandler(this.schema).omit(mask))
    }

    public extend<U>(schema: Schema<U>) {
        return new ObjectParser<Extend<T, U>>(new SchemaHandler(this.schema).extend(schema))
    }

    public override clone(): FieldParser<Resolve<T>, { optional: false; readonly: false }> {
        return new ObjectParser(this.schema)
    }
}

export const pObject = <T extends Schema<any>>(schema: T) => new ObjectParser<Unpack<T>>(schema)
export const obj = pObject

const e1 = obj({
    a: str(),
    b: num(),
    c: bool(),
    d: obj({
        e: str(),
        f: num(),
    }),
})
type e2 = ReturnType<typeof e1.parse>
const e3 = e1.pick({
    a: true,
    d: {
        e: true,
    },
})
type e4 = ReturnType<typeof e3.parse>
const e5 = e1.omit({
    a: true,
    d: {
        e: true,
    },
})
type e6 = ReturnType<typeof e5.parse>
const e7 = e1.extend({
    g: bool(),
})
type e8 = ReturnType<typeof e7.parse>
console.log(e3.parse({ a: "a", d: { e: "e" } }))
console.log(e5.parse({ a: "a", b: 1, c: true, d: { f: 2 } }))
console.log(e7.parse({ a: "a", b: 1, c: true, d: { e: "e", f: 2 }, g: false }))


const d1 = new SchemaHandler({
    a: pString(),
    b: pNumber(),
    c: pBoolean(),
    d: pObject({
        e: pString(),
        f: pNumber(),
    }),
})
const d2 = d1.extend({
    g: pBoolean(),
})
const d3 = d1.pick({
    a: true,
    d: {
        e: true,
    },
})
const d4 = d1.omit({
    a: true,
    d: {
        e: true,
    },
})

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

const c1 = obj({
    a: str(),
    b: num(),
    c: bool(),
})
type c2 = ReturnType<typeof c1.parse>
const c3 = c1.parse({ a: "a", b: 1, c: true })
console.log(c3)