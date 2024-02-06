import { OptionalParser } from "./OptionalParser.js";
import { IsOptional, IsReadonly, Parser } from "./Parser.js";
import { ReadonlyParser } from "./ReadonlyParser.js";
import { DeepOmit, DeepPick, Extend, Mask, Resolve, keys, map } from "./utils.js";
import { get } from "@prosopo/util"

export type Schema<T> = {
    [K in keyof T]: Parser<T[K]>
}

export type PartialSchema<T extends Schema<any>> = Resolve<{
    [K in keyof T]: OptionalParser<T[K]>
}>

export type ReadonlySchema<T extends Schema<any>> = Resolve<{
    [K in keyof T]: ReadonlyParser<T[K]>
}>

export class SchemaHandler<T extends Schema<any>> {
    constructor(private _schema: T) {

    }

    public get schema(): T {
        return map(this._schema, (parser) => parser.clone()) as unknown as T
    }

    public partial(): PartialSchema<T> {
        return map(this.schema, (parser, key) => {
            return new OptionalParser(parser)
        }) as any
    }

    public readonly(): ReadonlySchema<T> {
        return map(this.schema, (parser, key) => {
            return new ReadonlyParser(parser)
        }) as any
    }

    public extend<U>(schema: Schema<U>): Schema<Extend<T, U>> {
        const result: any = {}
        for (const key in this.schema) {
            result[key] = get(this.schema, key).clone()
        }
        for (const key in schema) {
            result[key] = schema[key].clone()
        }
        return result
    }

    public pick<U extends Mask<UnpackSchema<T>>>(mask: U): Schema<DeepPick<UnpackSchema<T>, U>> {
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

    public omit<U extends Mask<UnpackSchema<T>>>(mask: U): Schema<DeepOmit<UnpackSchema<T>, U>> {
        const result: any = {}
        for (const key in this.schema) {
            if (get(mask, key, false) === undefined) {
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

export type UnpackSchema<T> = Resolve<{
    // required + readwrite keys
    [K in keyof T as IsOptional<T[K]> extends false ? IsReadonly<T[K]> extends false ? K : never : never]: T[K] extends ObjectParser<infer V> ? V : T[K] extends Parser<infer U> ? U : never
} & {
    // optional + readwrite keys
    [K in keyof T as IsOptional<T[K]> extends true ? IsReadonly<T[K]> extends false ? K : never : never]?: T[K] extends Parser<infer U> ? U : never
} & {
    // required + readonly keys
    readonly [K in keyof T as IsOptional<T[K]> extends false ? IsReadonly<T[K]> extends true ? K : never : never]: T[K] extends Parser<infer U> ? U : never
} & {
    // optional + readonly keys
    readonly [K in keyof T as IsOptional<T[K]> extends true ? IsReadonly<T[K]> extends true ? K : never : never]?: T[K] extends Parser<infer U> ? U : never
}>

export type ExtractSchema<T extends ObjectParser<any>> = T extends ObjectParser<infer U> ? U : never

export class ObjectParser<T extends Schema<any>> extends Parser<UnpackSchema<T>> {

    private handler: SchemaHandler<T>

    constructor(schema: T) {
        super()
        this.handler = new SchemaHandler(schema)
    }

    public get schema() {
        return this.handler.schema
    }

    public override parse(value: unknown): UnpackSchema<T> {
        if (typeof value !== "object" || value === null) {
            throw new Error(`Expected an object but got ${JSON.stringify(value)} of type ${JSON.stringify(typeof value)}`)
        }
        const result = {} as any
        // track the unhandled keys in the value
        const unhandledKeys = new Set(Object.keys(value))
        for (const key of keys(this.schema)) {
            const parser = get(this.schema, key)
            const val = (value as any)[key]
            const output = parser.parse(val)
            if (val !== undefined) {
                // don't set the value if the value is undefined, as this is the default value returned for a non-existent field on an object
                // this also makes optional work properly
                result[key] = output
            }
            unhandledKeys.delete(String(key))
        }
        // TODO handle extra keys, allow / deny / drop / keep?
        // TODO inplace / clone?
        return result!
    }

    public override clone(): ObjectParser<T> {
        return new ObjectParser<T>(this.handler.schema)
    }

    public pick<U extends Mask<UnpackSchema<T>>>(mask: U) {
        return new ObjectParser(this.handler.pick(mask))
    }

    public omit<U extends Mask<UnpackSchema<T>>>(mask: U) {
        return new ObjectParser(this.handler.omit(mask))
    }

    public extend<U>(schema: Schema<U>) {
        return new ObjectParser(this.handler.extend(schema))
    }

    public partial() {
        return new ObjectParser(this.handler.partial())
    }

    public readonly() {
        return new ObjectParser(this.handler.readonly())
    }
}

export const pObject = <T extends Schema<any>>(schema: T) => new ObjectParser<T>(schema)
export const obj = pObject