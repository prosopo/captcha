import { OptionalParser } from "./OptionalParser.js";
import { IsOptional, IsReadonly, Parser } from "./Parser.js";
import { Resolve, keys, map } from "./utils.js";
import { get } from "@prosopo/util"

export type Schema<T> = {
    [K in keyof T]: Parser<T[K]>
}

export class SchemaHandler<T extends Schema<U>, U> {
    constructor(private _schema: T) {

    }

    public get schema(): T {
        return map(this._schema, (parser) => parser.clone()) as unknown as T
    }
}

export type UnpackSchema<T> = Resolve<{
    // required + readwrite keys
    [K in keyof T as IsOptional<T[K]> extends false ? IsReadonly<T[K]> extends false ? K : never : never]: T[K] extends Parser<infer U> ? U : never
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

export class ObjectParser<T, U extends Schema<T>> extends Parser<Resolve<T>> {

    private handler: SchemaHandler<U, T>

    constructor(schema: U) {
        super()
        this.handler = new SchemaHandler(schema)
    }

    public get schema() {
        return this.handler.schema
    }

    public override parse(value: unknown): Resolve<T> {
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
        return result as Resolve<T>
    }

    public override clone(): ObjectParser<T, U> {
        return new ObjectParser(this.handler.schema)
    }
}

export const pObject = <U extends Schema<any>>(schema: U) => new ObjectParser<UnpackSchema<U>, U>(schema)
export const obj = pObject