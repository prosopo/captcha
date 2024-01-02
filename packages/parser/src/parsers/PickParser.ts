// import { Parseable } from "./Parseable.js"
// import { BaseParser, ParseOptions, Parser } from "./Parser.js"

import { pBoolean } from "./BooleanParser.js"
import { pNumber } from "./NumberParser.js"
import { ObjectParser } from "./ObjectParser.js"

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
    c: {
        d: true,
        e: true,
    }
}
type C = Omit<B, 'c.d'>

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
    [K in keyof T]?: any
}

type Masked<T, U extends Mask<T>> = {
    [K in keyof T as U[K] extends true ? K : never]: U[K] extends object ? Masked<T[K], U[K]> : T[K]
}
type NeverMask<T> = {
    [K in keyof T]: T[K] extends never ? true : false
}

type OmitNevers<T> = {
    [K in keyof T as T[K] extends never ? never : K]: T[K]
}

const a3: {
    a: boolean,
    b: boolean,
    c: never,
} = {
    a: true,
    b: true,
    c: null!,
}
type T4 = OmitNevers<typeof a3>

const f1 = <T, U extends Mask<T>>(input: T, mask: U): Masked<T, U> => {
    return null!
}
const a2 = f1(a1, {
    a: true,
    b: true,
    d: {
        e: true,
        f: true,
    },
    x: true,
})
type T1 = typeof a2
type T2 = typeof a2.d
const a4: T1 = {
    a: 'hello',
    b: 1,
    d: {
        e: 'hello',
        f: 1,
    }
}

type T7 = {
    d: string,
    e: number,
}
type T5 = {
    a: string,
    b: number,
    c: T7,
}
type T6 = T5 & {
    c: Omit<T7, 'd'>,
}

// type Mask<T> = {
//     [K in keyof T]?: any
// }
type FilterKeys<T, U extends Mask<T>> = {
    [K in keyof T as U[K] extends true ? K : U[K] extends object ? K : never]: U[K] extends object ? FilterKeys<T[K], U[K]> : T[K]
    }

const f2 = <T extends ObjectParser<any>, U extends Mask<T>>(parser: V, mask: U): ObjectParser<FilterKeys<T, U>> => {
    return null!
}

const c1 = new ObjectParser({
    a: pBoolean(),
    b: pNumber(),
    c: new ObjectParser({
        d: pBoolean(),
        e: pNumber(),
    }),
})
const c2 = f2(c1, {
    a: true,
    c: {
        d: true,
    },
})

type T10 = {
    a: string,
    b: number,
    c: boolean,
    d: {
        e: string,
        f: number,
        g: boolean,
    },
}
type T11 = FilterKeys<T10, {
    a: true,
    b: true,
    d: {
        e: true,
        f: true,
    },
}>

{
    type FilterKeys<T, U extends {
        [K in keyof T]?: any;
    }> = {
        [K in keyof U]: U[K] extends object ? FilterKeys<T[K], U[K]> : T[K];
    };
    
    type OriginalType = {
        a: number;
        b: {
            c: string;
            d: boolean;
        };
        e: string[];
    };

    type FilteredType = FilterKeys<OriginalType, { b?: { c?: any } }>;

    const originalObject: OriginalType = {
        a: 42,
        b: {
            c: 'hello',
            d: true,
        },
        e: ['a', 'b', 'c'],
    };

    const filteredObject: FilteredType = {
        b: {
            c: 'hello',
        },
    };
}


{
    type Mask<T> = {
        [K in keyof T]?: boolean | Mask<T[K]>
    }
    type Masked<T, U extends Mask<T>> = {
        [K in keyof T]: U[K] extends true ? T[K] : U[K] extends Mask<T[K]> ? Masked<T[K], U[K]> : never
    }
    const f1 = <T, U extends Mask<T>>(input: T, mask: U): void => {
        return null!
    }
    const a2 = f1(a1, {
        a: true,
        b: true,
        d: {
            e: true,
            f: true,
        },
        x: true,
    })
    type T1 = typeof a2
    // type T2 = typeof a2.d
}