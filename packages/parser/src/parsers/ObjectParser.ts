import { inst } from "./InstanceParser.js";
import { OptionalParser } from "./OptionalParser.js";
import { IsOptional, IsReadonly, Validator, Shape, ValidateOptions } from "./Parser.js";
import { ReadonlyParser } from "./ReadonlyParser.js";
import { RequiredParser } from "./RequiredParser.js";
import { DeepOmit, DeepPick, Extend, Mask, Prop, Resolve, keys, map } from "./utils.js";
import { get } from "@prosopo/util"

export type Schema<T> = {
    [K in keyof T]: Validator<unknown, T[K]>
}

export type PartialSchema<T extends Schema<any>> = Resolve<{
    [K in keyof T]: OptionalParser<T[K]>
}>

export type DeepPartialSchema<T extends Schema<any>> = PartialSchema<{
    [K in keyof T]: T[K] extends ObjectParser<infer U> ? ObjectParser<DeepPartialSchema<U>> : T[K]
}>

export type ReadonlySchema<T extends Schema<any>> = Resolve<{
    [K in keyof T]: ReadonlyParser<T[K]>
}>

export type DeepReadonlySchema<T extends Schema<any>> = ReadonlySchema<{
    [K in keyof T]: T[K] extends ObjectParser<infer U> ? ObjectParser<DeepReadonlySchema<U>> : T[K]
}>

export type RequiredSchema<T extends Schema<any>> = Resolve<{
    [K in keyof T]: RequiredParser<T[K]>
}>

export type DeepRequiredSchema<T extends Schema<any>> = RequiredSchema<{
    [K in keyof T]: T[K] extends ObjectParser<infer U> ? ObjectParser<DeepRequiredSchema<U>> : T[K]
}>

export type ReadWriteSchema<T extends Schema<any>> = Resolve<{
    [K in keyof T]: RequiredParser<T[K]>
}>

export type DeepReadWriteSchema<T extends Schema<any>> = ReadWriteSchema<{
    [K in keyof T]: T[K] extends ObjectParser<infer U> ? ObjectParser<DeepReadWriteSchema<U>> : T[K]
}>

export type PickPartialSchema<T extends Schema<any>, U extends Mask<UnpackSchema<T>>> = Resolve<{
    [K in keyof T & keyof U]: T[K] extends ObjectParser<infer V> ? U[K] extends object ? ObjectParser<PickPartialSchema<V, U[K]>> : OptionalParser<T[K]> : OptionalParser<T[K]>
}>

export type PickReadonlySchema<T extends Schema<any>, U extends Mask<UnpackSchema<T>>> = Resolve<{
    [K in keyof T & keyof U]: T[K] extends ObjectParser<infer V> ? U[K] extends object ? ObjectParser<PickReadonlySchema<V, U[K]>> : ReadonlyParser<T[K]> : ReadonlyParser<T[K]>
}>

export type PickRequiredSchema<T extends Schema<any>, U extends Mask<UnpackSchema<T>>> = Resolve<{
    [K in keyof T & keyof U]: T[K] extends ObjectParser<infer V> ? U[K] extends object ? ObjectParser<PickRequiredSchema<V, U[K]>> : RequiredParser<T[K]> : RequiredParser<T[K]>
}>

export type PickReadWriteSchema<T extends Schema<any>, U extends Mask<UnpackSchema<T>>> = Resolve<{
    [K in keyof T & keyof U]: T[K] extends ObjectParser<infer V> ? U[K] extends object ? ObjectParser<PickReadWriteSchema<V, U[K]>> : RequiredParser<T[K]> : RequiredParser<T[K]>
}>

export type OmitPartialSchema<T extends Schema<any>, U extends Mask<UnpackSchema<T>>> = Resolve<{
    [K in keyof T as K extends keyof U ? U[K] extends object ? K : never : K]: T[K] extends ObjectParser<infer V> ? Prop<U, K> extends object ? ObjectParser<OmitPartialSchema<V, Prop<U, K>>> : never : OptionalParser<T[K]>
}>

export type OmitReadonlySchema<T extends Schema<any>, U extends Mask<UnpackSchema<T>>> = Resolve<{
    [K in keyof T as K extends keyof U ? U[K] extends object ? K : never : K]: T[K] extends ObjectParser<infer V> ? Prop<U, K> extends object ? ObjectParser<OmitReadonlySchema<V, Prop<U, K>>> : never : ReadonlyParser<T[K]>
}>

export type OmitRequiredSchema<T extends Schema<any>, U extends Mask<UnpackSchema<T>>> = Resolve<{
    [K in keyof T as K extends keyof U ? U[K] extends object ? K : never : K]: T[K] extends ObjectParser<infer V> ? Prop<U, K> extends object ? ObjectParser<OmitRequiredSchema<V, Prop<U, K>>> : never : RequiredParser<T[K]>
}>

export type OmitReadWriteSchema<T extends Schema<any>, U extends Mask<UnpackSchema<T>>> = Resolve<{
    [K in keyof T as K extends keyof U ? U[K] extends object ? K : never : K]: T[K] extends ObjectParser<infer V> ? Prop<U, K> extends object ? ObjectParser<OmitReadWriteSchema<V, Prop<U, K>>> : never : RequiredParser<T[K]>
}>

// export type DeepOmit<T, U extends Mask<T>> = Resolve<{
//     [K in keyof T as K extends keyof U ? U[K] extends object ? K : never : K]: U[K] extends object ? DeepOmit<T[K], U[K]> : T[K];
// }>

export class SchemaHandler<T extends Schema<any>> {
    constructor(private _schema: T) {

    }

    public get schema(): T {
        return map(this._schema, (parser) => parser.clone()) as unknown as T
    }

    public get name(): string {
        return `{\n\t${keys(this.schema).map(key => `${String(key)}: ${get(this.schema, key).name}`).join(",\n\t")}\n}`
    }

    public partialShallow(): PartialSchema<T> {
        return map(this.schema, (parser, key) => {
            return new OptionalParser(parser)
        }) as any
    }

    public partialDeep(): DeepPartialSchema<T> {
        return map(this.schema, (parser, key) => {
            if (parser instanceof ObjectParser) {
                return new OptionalParser(parser.partialDeep())
            }
            return new OptionalParser(parser)
        }) as any
    }

    public pickPartial<U extends Mask<UnpackSchema<T>>>(mask: U): PickPartialSchema<T, U> {
        const result: any = {}
        for (const key in mask) {
            const parser = (this.schema as any)[key]
            if (parser === undefined) {
                throw new Error(`Parser is undefined, expected valid parser for deep pick`)
            }
            result[key] = new OptionalParser(parser)
        }
        return result
    }

    public omitPartial<U extends Mask<UnpackSchema<T>>>(mask: U): OmitPartialSchema<T, U> {
        const result: any = {}
        for (const key in this.schema) {
            if (get(mask, key, false) === undefined) {
                const parser = (this.schema as any)[key]
                if (parser === undefined) {
                    throw new Error(`Parser is undefined, expected valid parser for deep omit`)
                }
                result[key] = new OptionalParser(parser)
            }
        }
        return result
    }

    public readonlyShallow(): ReadonlySchema<T> {
        return map(this.schema, (parser, key) => {
            return new ReadonlyParser(parser)
        }) as any
    }

    public readonlyDeep(): DeepReadonlySchema<T> {
        return map(this.schema, (parser, key) => {
            if (parser instanceof ObjectParser) {
                return new ReadonlyParser(parser.readonlyDeep())
            }
            return new ReadonlyParser(parser)
        }) as any
    }

    public pickReadonly<U extends Mask<UnpackSchema<T>>>(mask: U): PickReadonlySchema<T, U> {
        const result: any = {}
        for (const key in mask) {
            const parser = (this.schema as any)[key]
            if (parser === undefined) {
                throw new Error(`Parser is undefined, expected valid parser for deep pick`)
            }
            if (parser instanceof ObjectParser) {
                result[key] = new ReadonlyParser(parser.readonlyDeep())
            }
            result[key] = new ReadonlyParser(parser)
        }
        return result
    }

    public omitReadonly<U extends Mask<UnpackSchema<T>>>(mask: U): OmitReadonlySchema<T, U> {
        const result: any = {}
        for (const key in this.schema) {
            if (get(mask, key, false) === undefined) {
                const parser = (this.schema as any)[key]
                if (parser === undefined) {
                    throw new Error(`Parser is undefined, expected valid parser for deep omit`)
                }
                if (parser instanceof ObjectParser) {
                    result[key] = new ReadonlyParser(parser.readonlyDeep())
                }
                result[key] = new ReadonlyParser(parser)
            }
        }
        return result
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

export type UnpackSchema<T> = Extend<{
    // normal keys
    [K in keyof T]: Shape<T[K]>
}, Extend<{
    // optional keys
    [K in keyof T as IsOptional<T[K]> extends true ? K : never]?: Shape<T[K]>
}, Extend<{
    // readonly keys
    readonly [K in keyof T as IsReadonly<T[K]> extends true ? K : never]: Shape<T[K]>
}, {
    // optional + readonly keys
    readonly [K in keyof T as IsOptional<T[K]> extends true ? IsReadonly<T[K]> extends true ? K : never : never]?: Shape<T[K]>
}>>>

export type ExtractSchema<T extends ObjectParser<any>> = T extends ObjectParser<infer U> ? U : never

export class ObjectParser<T extends Schema<any>> extends Validator<unknown, UnpackSchema<T>> {

    private handler: SchemaHandler<T>

    constructor(schema: T) {
        super()
        this.handler = new SchemaHandler(schema)
    }

    public get schema() {
        return this.handler.schema
    }

    public override get name(): string {
        return this.handler.name
    }

    public override validate(value: unknown, options?: ValidateOptions): UnpackSchema<T> {
        // if cloning enabled, the result should be an empty object
        // else the result should be the same object as the input
        const result = options?.disableInPlace ? {} as any : inst(Object).validate(value) as any
        // track the unhandled keys in the value
        const unhandledKeys = new Set(Object.keys(value as any))
        // iterate through all fields defined by the schema
        for (const key of keys(this.schema)) {
            // find the corresponding parser in the schema
            const parser = get(this.schema, key)
            // get the field value from the input
            const val = (value as any)[key]
            // parse the field value
            const output = parser.validate(val, options)
            // if cloning enabled, assign the field to the result
            if (options?.disableInPlace) {
                result[key] = output
            }
            // delete the key from the unhandled keys as it has been handled
            unhandledKeys.delete(String(key))
        }
        // if there are unhandled keys, throw an error
        if (unhandledKeys.size > 0) {
            throw new Error(`Unhandled keys: ${Array.from(unhandledKeys).join(", ")}`)
        }
        return result as UnpackSchema<T>
    }

    public override clone(): ObjectParser<T> {
        return new ObjectParser<T>(this.handler.schema)
    }

    public pick<U extends Mask<UnpackSchema<T>>>(mask: U) {
        return new ObjectParser(this.handler.pick(mask))
    }

    public pickPartial<U extends Mask<UnpackSchema<T>>>(mask: U) {
        return new ObjectParser(this.handler.pickPartial(mask))
    }

    public pickReadonly<U extends Mask<UnpackSchema<T>>>(mask: U) {
        return new ObjectParser(this.handler.pickReadonly(mask))
    }

    public omit<U extends Mask<UnpackSchema<T>>>(mask: U) {
        return new ObjectParser(this.handler.omit(mask))
    }

    public omitPartial<U extends Mask<UnpackSchema<T>>>(mask: U) {
        return new ObjectParser(this.handler.omitPartial(mask))
    }

    public omitReadonly<U extends Mask<UnpackSchema<T>>>(mask: U) {
        return new ObjectParser(this.handler.omitReadonly(mask))
    }

    public extend<U>(schema: Schema<U>) {
        return new ObjectParser(this.handler.extend(schema))
    }

    public partialShallow() {
        return new ObjectParser(this.handler.partialShallow())
    }

    public partialDeep() {
        return new ObjectParser(this.handler.partialDeep())
    }

    public readonlyShallow() {
        return new ObjectParser(this.handler.readonlyShallow())
    }

    public readonlyDeep() {
        return new ObjectParser(this.handler.readonlyDeep())
    }
}

export const pObject = <T extends Schema<any>>(schema: T) => new ObjectParser<T>(schema)
export const obj = pObject
export const object = pObject