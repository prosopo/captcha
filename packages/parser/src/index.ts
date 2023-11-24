// TODO should parsing options be specific to the parser? probably. E.g. coerce makes no sense for object/array parsing
// TODO export functions independently to allow tree shaking
// TODO add parser for native enum
// TODO choose between classic enum parsing and new (ts v5+) enum parsing using const in generic arg
// TODO add extends
// TODO build validation fns (can use external lib for that)
// TODO add .merge()
// TODO add .pick()
// TODO add .omit()
// TODO add .partial()
// TODO add .deepPartial() - can be arg to parser?
// TODO add passthrough
// TODO add .default()
// TODO add .strip()
// TODO add .catchall()
// TODO add .element()
// TODO add .nonempty()
// TODO add tuple
// TODO add discriminate unions
// TODO add maps
// TODO add sets
// TODO add intersection
// TODO add recursive type support
// TODO add JSON parsing
// TODO add function parsing
// TODO brand?


import z from 'zod'


interface Validator<T> {
    // Validate a value and throw an error if it is invalid
    validate(value: T): void
    // Check whether a value is valid
    isValid(value: T): boolean
}

abstract class BaseValidator<T> implements Validator<T> {
    isValid(value: T): boolean {
        try {
            this.validate(value)
            return true
        } catch {
            return false
        }
    }

    abstract validate(value: T): void
}

interface Parser<T> {
    // parse the value, throwing an error if it is invalid due to incorrect shape (or type) or if invalid according to the validators. This returns the parsed value
    parse(value: unknown, options?: ParseOptions): T
    // add a validator to check the value is value when parsing, throwing an error if it is invalid. This returns the parser so that you can chain it with other methods
    ensure(validator: Validator<T>): this
    // validate the value, throwing an error if it is invalid
    validate(value: T): void
    // get the validators
    validators: Validator<T>[] // like gladiators, but less violent
    // do the union of two parsers, this parser and another.
    // union<U>(parser: Parser<U>): Parser<T|U>
    // access the shape of the parsed type. This is helpful for pulling the parsed type out of any given parser, e.g. const p = parser.string(); type T = typeof p.shape
    readonly shape: T
}

// Type that maps an object's properties to parsers for those properties
type Parseable<T> = {
    [Property in keyof T]: Parser<T[Property]>
}

interface ParseOptions {
    noStrict?: boolean // whether to allow extra keys in an object. E.g. if expecting object to have shape { a: number }, strict mode would reject parsing { a: 1, b: 2 } whereas non-strict mode would allow it. Note that 'b' would be ignored in the types but would remain present in the underlying object. E.g. the type would be inferred as { a: number } but the value would be { a: 1, b: 2 }, so you cannot access 'b' but it is still there. This is desireable if you've got a big object and you want to parse a small subset of it, but you don't want to have to manually remove the extra keys. This setting defaults to false.
    noStripExtraKeys?: boolean // whether to strip extra keys from an object. E.g. if expecting object to have shape { a: number } and received { a: 1, b: 2 }, stripExtraKeys === true would remove the 'b' entry leaving { a: 1 }
    coerce: boolean // whether to coerce primitives into others, e.g. "5" to number 5, "true" to boolean true, etc. These are the same coercions that happen when using JSON.parse(). This setting defaults to false.
}

abstract class BaseParser<T> implements Parser<T> {
    #validators: Validator<T>[] = []

    parse(value: unknown, options?: ParseOptions): T {
        const parsed = this.parseShape(value, options)
        this.validate(parsed)
        return parsed
    }

    // Parse the shape only, without validating it
    abstract parseShape(value: unknown, options?: ParseOptions): T

    validate(value: T): void {
        for(const validator of this.validators) {
            validator.validate(value)
        }
    }

    ensure(validator: Validator<T>): this {
        this.validators.push(validator)
        return this
    }
    
    get validators(): Validator<T>[] {
        return this.#validators
    }

    set validators(validators: Validator<T>[]) {
        this.#validators = validators
    }

    // union<U>(parser: Parser<U>): Parser<T | U> {
    //     return new UnionParser2(this, parser)
    // }

    get shape(): T {
        throw new Error('Do not call this method')
    }

}

class StringParser extends BaseParser<string> {
    override parseShape(value: unknown, options?: ParseOptions): string {
        if(options?.coerce) {
            value = String(value)
        }
        if(typeof value !== 'string') {
            throw new Error(`Expected string but got ${typeof value}`)
        }
        return value
    }
}

class NumberParser extends BaseParser<number> {
    override parseShape(value: unknown, options?: ParseOptions): number {
        if(options?.coerce) {
            value = Number(value)
        }
        if(typeof value !== 'number') {
            throw new Error(`Expected number but got ${typeof value}`)
        }
        return value
    }
}

class BooleanParser extends BaseParser<boolean> { 
    override parseShape(value: unknown, options?: ParseOptions): boolean {
        if(options?.coerce) {
            value = Boolean(value)
        }
        if(typeof value !== 'boolean') {
            throw new Error(`Expected boolean but got ${typeof value}`)
        }
        return value
    }
}

class DateParser extends BaseParser<Date> {
    override parseShape(value: unknown, options?: ParseOptions): Date {
        if(options?.coerce && 
            (typeof value === 'string' || typeof value === 'number' || value instanceof Date)
        ) {
            value = new Date(value)
        }
        if(!(value instanceof Date)) {
            throw new Error(`Expected date but got ${typeof value}`)
        }
        return value
    }
}

class LiteralParser<T> extends BaseParser<T> {
    constructor(private literal: T) {
        super()
    }

    parseShape(value: unknown, options?: ParseOptions): T {
        if(value !== this.literal) {
            throw new Error(`Expected literal ${this.literal} but got ${value}`)
        }
        return value as T
    }
}

class OptionalParser<T> extends BaseParser<T | undefined> {
    constructor(private parser: Parser<T>) {
        super()
    }

    override parseShape(value: unknown, options?: ParseOptions | undefined): T | undefined {
        if(value === undefined) {
            return undefined
        }
        return this.parser.parse(value, options)
    }

    override validate(value: T | undefined): void {
        // run validators in this object as usual
        super.validate(value)
        if(value === undefined) {
            // value missing, so no need to validate it further
            return
        }
        // value present, so validate further
        this.parser.validate(value)
    }
}

class NullableParser<T> extends BaseParser<T | null> {
    constructor(private parser: Parser<T>) {
        super()
    }

    override parseShape(value: unknown, options?: ParseOptions | undefined): T | null {
        if(value === null) {
            return null
        }
        return this.parser.parse(value, options)
    }

    override validate(value: T | null): void {
        // run validators in this object as usual
        super.validate(value)
        if(value === null) {
            // value missing, so no need to validate it further
            return
        }
        // value present, so validate further
        this.parser.validate(value)
    }
}

// TODO can we combine nullable and optional into some kind of except or union?

type Entries<T> = {
    [K in keyof T]: [K, T[K]];
}[keyof T][];

class ObjectParser<T extends {}> extends BaseParser<T> {

    constructor(private schema: Parseable<T>) {
        super()
    }

    parseShape(value: unknown, options?: ParseOptions): T {
        // check runtime type
        if(typeof value !== 'object') {
            throw new Error(`Expected object but got ${typeof value}`)
        }
        if(value === null) {
            throw new Error(`Expected object but got null`)
        }
        // check for additional keys if strict mode is enabled
        if(!options?.noStrict) {
            if(Object.keys(value).length > Object.keys(this.schema).length) {
                // either throw an error or remove the extra keys
                if(!options?.noStripExtraKeys) {
                    throw new Error(`Unexpected additional keys found in object: ${Object.keys(value).filter(key => !(key in this.schema)).join(', ')}`)
                } else {
                    // find the extra keys by comparing against the schema
                    const actualKeys = Object.keys(value)
                    const expectedKeys = new Set(Object.keys(this.schema))
                    const extraKeys = actualKeys.filter(key => !expectedKeys.has(key))
                    // remove the extra keys
                    for(const key of extraKeys) {
                        delete (value as any)[key]
                    }
                }
            }
        }
        // check the expected keys are present
        const entries = Object.entries(this.schema) as Entries<Parseable<T>>
        for(const [key, subSchema] of entries) {
            if(!(key in value)) {
                throw new Error(`Expected object to have key ${String(key)}`)
            }
            // parse the value for the key
            subSchema.parse((value as any)[key] as unknown)
        }
        return value as T
    }
}

class ArrayParser<T> extends BaseParser<T[]> {
    
    constructor(private schema: Parser<T>) {
        super()
    }

    parseShape(value: unknown, options?: ParseOptions): T[] {
        // check runtime type
        if(!Array.isArray(value)) {
            throw new Error(`Expected array but got ${typeof value}`)
        }
        // parse each element
        for(const [index, el] of value.entries()) {
            this.schema.parse(el)
        }
        return value as T[]
    }
}

// export type Lit = string | number | boolean | undefined | null | void | {};
// export const tuple = <T extends Lit[]>(...args: T) => args;
// const list = tuple('a','b','c',{
//     a:1
// });  // type is ['a','b','c']
// type NeededUnionType = typeof list[number]; // 'a'|'b'|'c'

// type ValueOf<T> = T[keyof T];

// type ArrayToObject<T extends []> = {
//     [K in keyof T]: T[K];
// };

// const r1 = [1,2,3, true]
// type r2 = typeof r1[number]

// type EnumVariant = boolean | number | string

// type Literal<T> = string | boolean | number | null | undefined | Readonly<Array<Literal<T>>>
// // type Variants<U extends Literal, T extends Readonly<[U, ...U[]]>> = T[number]

// const xyz = <U extends string, T extends Readonly<[U, ...U[]]>>(values: T): T[number] => {
//     return ...values as unknown as T[number]
// }
// const q1 = xyz(['a', 'b', 'c'])
// console.log('q1', q1)

// const tuple = <T extends string[]>(...args: T) => args;

// // const fn1 = <U, T extends Readonly<Array<U>>>(value: T): T[number] => {
// //     return value[2] as unknown as T[number]
// // }
// const fn1 = <T extends string[]>(...values: T): T[number] => {
//     return values[2] as unknown as T[number]
// }
// // | readonly object
// // const fn2 = <V, U extends Literal<V>, T extends Readonly<[U, ...U[]]>>(values: T): T[number] => {
// //     return null as unknown as T[number]
// // }
// const fn2 = <V, U extends string | boolean | number | null | undefined | readonly object, T extends Readonly<[U, ...U[]]>>(values: T): T[number] => {
//     return null as unknown as T[number]
// }

// const fn3 = <T extends string[]>(values: T): {
//     [k in T[number]]: k;
// } => {
//     return null as unknown as {
//         [k in T[number]]: k;
//     }
// }

// const v2 = fn1('a', 'b', 'c')
// const v3 = tuple('a', 'b', 'c')
// // , { a: 1 }
// const v4 = fn2(['a', 'b', 'c', false, 3])
// const v5: [string, ...string[]] = ['a', 'b', 'c']
// const v6 = ['a', 'b', 'c'] as const
// const v7 = fn3(['a', 'b', 'c'])

type EnumVariant = string | number
type EnumMap<U extends EnumVariant, T extends Readonly<U[]>> = {
    [K in T[number]]: K
}
class EnumParser<U extends EnumVariant, T extends ReadonlyArray<U>> extends BaseParser<T[number]> {

    readonly #options: T

    constructor(options: T) {
        super()
        this.#options = options
    }

    parseShape(value: unknown, options?: ParseOptions): T[number] {
        // check runtime type
        if(!this.options.includes(value as U)) {
            throw new Error(`Expected enum option to be one of ${this.options.join(', ')} but got ${value}`)
        }
        return value as U
    }

    get options(): Readonly<T[number][]> {
        return this.#options
    }

    get enum() {
        const result = {} as {
            [K in T[number]]: K
        }
        for(const value of this.options) {
            result[value] = value
        }
        return result
    }

}

class EnumParser2<const U, const T extends readonly U[]> extends BaseParser<T[number]> {

    constructor(private values: T) {
        super()
    }

    parseShape(value: unknown, options?: ParseOptions): T[number] {
        // check runtime type
        if(!this.values.includes(value as U)) {
            throw new Error(`Expected enum value to be one of ${this.values.join(', ')} but got ${value}`)
        }
        return value as U
    }
}

type NativeEnum = {
    [key: string]: number | string
}
class NativeEnumParser<T extends NativeEnum> extends BaseParser<T> {
    constructor(private nativeEnum: T) {
        super()
    }

    parseShape(value: unknown, options?: ParseOptions): T {
        // check runtime type
        if(!this.options.includes(value as T)) {
            throw new Error(`Expected enum value to be one of ${this.options.join(', ')} but got ${value}`)
        }
        return value as T
    }

    get options(): Readonly<T[]> {
        const result = [] as T[]
        // enums are laid out like this:
        // { 
        //   '0': 'Red', 
        //   '1': 'Green',
        //   '2': 'Blue',
        //   Red: 0,
        //   Green: 1,
        //   Blue: 2
        // }
        // to allow for reverse lookup. All of the keys map to numeric values
        for(const key in this.nativeEnum) {
            if(typeof this.nativeEnum[key] === 'number') {
                result.push(key as unknown as T)
            }
        }
        return result
    }

    get enum() {
        const result = {} as {
            [K in keyof T]: K
        }
        for(const key in this.nativeEnum) {
            if(typeof key === 'string') {
                result[key] = key
            }
        }
        return result
    }
}

class UnionParser<T> extends BaseParser<T> {
    constructor(private parsers: Readonly<Parser<T>[]>) {
        super()
    }

    parseShape(value: unknown, options?: ParseOptions): T {
        // one of the parsers should work
        for(const parser of this.parsers) {
            try {
                return parser.parse(value)
            } catch {}
        }
        throw new Error(`Expected value to match one of the union parsers but none matched`)
    }

    override validate(value: T): void {
        super.validate(value)
        // validate against each parser
        for(const parser of this.parsers) {
            parser.validate(value)
        }
    }
}

class UnionParser2<T, U> extends BaseParser<T | U> {
    constructor(private first: Parser<T>, private second: Parser<U>) {
        super()
    }

    parseShape(value: unknown, options?: ParseOptions): T | U {
        // one of the parsers should work
        for(const parser of [this.first, this.second]) {
            try {
                return parser.parse(value)
            } catch {}
        }
        throw new Error(`Expected value to match one of the union parsers but none matched`)
    }

    override validate(value: T | U): void {
        super.validate(value)
        // validate against each parser
        for(const parser of [this.first, this.second]) {
            try {
                parser.validate(value as U & T)
            } catch {}
        }
        throw new Error(`Expected value to match one of the union parsers but none matched`)
    }
}

const p = {
    string(): Parser<string> {
        return new StringParser()
    },
    number(): Parser<number> {
        return new NumberParser()
    },
    boolean(): Parser<boolean> {
        return new BooleanParser()
    },
    object<T extends {}>(schema: Parseable<T>) {
        return new ObjectParser<T>(schema)
    },
    array<T>(schema: Parser<T>) {
        return new ArrayParser<T>(schema)
    },
    enum<U extends EnumVariant, T extends Readonly<U[]>>(values: T) {
        return new EnumParser<U, T>(values)
    },
    enum2<const U, const T extends readonly U[]>(values: T) {
        return new EnumParser2<U, T>(values)
    },
    union<T, U>(parsers: [Parser<T>, Parser<U>, ...Parser<T|U>[]]) {
        return new UnionParser<T|U>(parsers)
    },
}

const tuple1 = <U, T extends U[]>(...args: T) => args;
function tuple2<U, T extends Array<U>>(...cons: T): {
    [K in keyof T]: T[K] extends U ? T[K] : never
};
function tuple2<U, T extends Array<U>>(...cons: T): any {
    return cons as any
}
const tuple3 = <U, T extends readonly U[]>(...args: T): readonly [...U[]] => {
    return args
}
const tuple4 = <const U, const T extends readonly U[]>(...args: T) => {
    return args
}
const arrayToObject = <U, T extends U[]>(arr: T) => {
    return arr.reduce((acc, el, index) => {
        acc[index] = el
        return acc
    }, {} as {
        [key: number]: U
    })
}
const tuple5 = <const U, const T extends U[]>(args: [...T]) => {
    return args
}

const union3 = <T, U extends Parser<T>, V extends U[]>(parsers: [U, ...V]): Parser<T> => {
    let result: Parser<T> = parsers[0]
    for(const parser of parsers.slice(1)) {
        // result = result.union(parser)
    }
    return result
}

type ArrayElementType<T> = T extends (infer U)[] ? U : never
type ArrayType<T> = T extends (infer U)[] ? U[] : never
const union4 = <T>(arr: T): ArrayElementType<T> => {
    return null as ArrayElementType<T>
}
const union5 = <T, U extends ArrayType<Parser<T>[]>>(arr: U): U => {
    return null as unknown as U
}
type ParserUnion<T> = T extends Parser<infer U>[] ? Parser<U> : never
// type q16 = ParserArrayOutput<[Parser<string>, Parser<number>, Parser<boolean>]>
const union6 = <T, U extends Parser<T>[]>(arr: U): ParserUnion<U> => {
    return null as unknown as ParserUnion<U>
}

type EnumType<T> = T extends (infer U)[] ? U : never
const enum6 = <const T, U extends T[]>(arr: U): EnumType<U> => {
    return null as EnumType<U>
}

// const q1 = new UnionParser<string|number>([new StringParser(), new NumberParser()])
// const q3: Parser<number|string>[] = [p.number(), p.string()]
// const q2 = p.union(q3)
const q3: Parser<number|string>[] = [p.number(), p.string()]
// const q4 = p.union([p.number(), p.string(), p.boolean()])
const q5 = tuple1('a', 1, true)
const q6 = ['a', 'b', 'c']
const q7 = arrayToObject<string, string[]>(q6)
const q8 = q7[0]
const q9 = tuple3<string, string[]>('a', 'b', 'c')
const q10 = tuple4('a', 'b', 'c')
const q11 = p.enum2(['a', 'b', 'c'])
const q12 = tuple5(['a', 'b', 'c'])
const q13 = union5([p.string(), p.number(), p.boolean()])
const q14 = union4(['a', 'b', 'c', 1])
const q15 = union4([p.string(), p.number(), p.boolean()])
const q17 = union6([p.string(), p.number(), p.boolean()])
const q18 = enum6(['a', 'b', 'c', 1, true])
const q19: ReturnType<StringParser["parse"]> = null as unknown as string
const q20 = p.string();
type q21 = typeof q20.shape
const q22 = p.enum(['a', 'b', 'c'])
type q23 = typeof q22.shape
const q24 = q22.options
const q25 = q22.enum.a
type q26 = typeof q22.options

enum Abcdef {
    a = 'a',
    b = 'b',
    c = 'c',
    d = 3,
    e = 4,
    f = 5,
}
type q27 = typeof Abcdef
type q28 = typeof Abcdef.a
const q29 = new NativeEnumParser(Abcdef)


const z1 = p.enum(['a', 'b', 'c'])
const z3 = new EnumParser<'a'|'b'|'c',[('a'|'b'|'c'), ...('a'|'b'|'c')[]]>(['a', 'b', 'c'])
// const z3 = new EnumParser<'a'|'b'|'c',[('a'|'b'|'c'), ...('a'|'b'|'c')[]]>(['a', 'b', 'c'])
const z2 = z1.parse('a')
const z4 = z3.parse('a')

const x2Schema = p.object({
    a: p.string(),
    b: p.number(),
    c: p.boolean(),
    d: p.object({
        e: p.string(),
        f: p.number(),
        g: p.boolean(),
    }),
    h: p.array(p.string()),
    i: p.array(p.number()),
    j: p.array(p.boolean()),
    k: p.array(p.object({
        l: p.string(),
        m: p.number(),
        n: p.boolean(),
    })),
    o: p.enum(['a', 'b', 'c']),
})

const x2 = x2Schema.parse({
    a: 'hello',
    b: 1,
    c: true,
    d: {
        e: 'goodbye',
        f: 2,
        g: false,
    },
})

console.log('x2', x2)

