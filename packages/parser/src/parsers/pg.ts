import { get } from "@prosopo/util";
import { ArrayParser } from "./ArrayParser.js";
import { BooleanParser } from "./BooleanParser.js";
import { EnumParser, pEnum } from "./EnumParser.js";
import { NativeEnumParser } from "./NativeEnumParser.js";
import { NumberParser } from "./NumberParser.js";
import { ObjectParser } from "./ObjectParser.js";
import { StringParser } from "./StringParser.js";
import { TupleParser } from "./TupleParser.js";
import { PickParser } from "./PickParser.js";

enum Tux {
    A = 'x',
    B = 'x',
    C = 'y',
}
console.log(Tux)

// const e1 = pEnum(['a', 'b', 'c'])
// const e2 = pEnum('a', 'b', 'c')
// console.log(e1.parse('a'))
// console.log(e2.parse('a'))
// // console.log(e1.parse('d'))
// console.log(e2.parse('d'))
// type e3 = ReturnType<typeof e1.parse>
// type e4 = ReturnType<typeof e2.parse>
// const e5 = pEnum(['a', 'b', 'c', true, 5])
// type e6 = ReturnType<typeof e5.parse>
// const e7 = pEnum('a', 'b', 'c', true, 5)


type Prop<T extends string> = T extends `${infer U}.${infer V}` ? U : T
type Rest<T extends string> = T extends `${infer U}.${infer V}` ? V : never
type Key<T, U extends string> = U extends `${infer K}` ? K extends keyof T ? K : never : never
type PickStr<T, U extends string> = Pick<T, Key<T, U>>
// type DeepPick<T, U extends string> = U extends `${infer Prop}.${infer Rest}` ? {
//     [K in Prop & keyof T]: DeepPick<T[K], Rest>
// } : Pick<T, Key<T, U>> extends object ?{
//     [K in U & keyof T]: T[K]
// } : Pick<T, Key<T, U>>
type DeepPick<T, U extends string> = U extends `${infer Prop}.${infer Rest}` ? 3 : Pick<T, Key<T, U>>

type q1 = {
    a: number
}
type q2 = DeepPick<q1, 'a'>
type q3 = DeepPick<q1, ''>
type q4 = {
    a: {
        b: number
    }
}
type q5 = DeepPick<q4, 'a.b'>
type q6 = DeepPick<q4, 'a'>
type q7 = DeepPick<q4, ''>
    
//     {
//     [K in keyof T as K extends string ? K extends Prop<U> ? K : never : never]: DeepPick<T[P], Rest<K>>;
// }

type r1 = {
    a: {
        b: {
            c: number
        }
    }
}
type r2 = DeepPick<r1, 'a.b.c'>
type r3 = DeepPick<r1, 'a.b'>



const a1 = new ObjectParser({
    a: new NumberParser(),
    b: new BooleanParser(),
    c: new StringParser(),
    d: new ObjectParser({
        e: new NumberParser(),
        f: new BooleanParser(),
        g: new StringParser(),
    })
})
type A1p = ReturnType<typeof a1.parse>
// const a6 = a1.extend({
//     h: new NumberParser(),
//     i: new BooleanParser(),
//     j: new StringParser(),
// })
// type A6p = ReturnType<typeof a6.parse>

type y1 = {
    a: number,
    b: boolean,
    c: string,
}
type y2 = boolean[]
type y3 = Pick<y1, 'a' | 'b'>
type y4 = Pick<y2, 0 | 1>
type y5 = Omit<y2, 0 | 1>
type y6 = number
type y7 = Pick<y6, "toString">

type Mask<T> = {
    [K in keyof T]?: any
}
type Infer<T> = T extends infer U ? {
    [K in keyof U]: U[K]
} : never
type PickMask<T, U> = {
    [K in keyof U & keyof T]: U[K] extends Mask<T[K]> ? Infer<PickMask<T[K], U[K]>> : T[K]
}
type OmitMask<T, U extends Mask<T>> = {
    [K in keyof T as K extends keyof U ? U[K] extends object ? K : never : K]: U[K] extends Mask<T[K]> ? Infer<OmitMask<T[K], U[K]>> : T[K]
}
// type PickMask<T, U> = {
//     [K in keyof U & keyof T]: U[K] extends Mask<T[K]> ? PickMask<T[K], U[K]> extends infer V ? {
//         [K2 in keyof V]: V[K2]
//     } : never : T[K]
// }
// type OmitMask<T, U extends Mask<T>> = {
//     [K in keyof T as K extends keyof U ? U[K] extends object ? K : never : K]: U[K] extends Mask<T[K]> ? OmitMask<T[K], U[K]> extends infer V ? {
//         [K2 in keyof V]: V[K2]
//     } : never : T[K]
// }
// type Masked<T, U> = Pick<{
//     [K in keyof U & keyof T]: (U[K] extends Mask<T[K]> ? Masked<T[K], U[K]> : T[K]) extends infer V ? {
//         [K2 in keyof V]: V[K2]
//     } : never
// }, keyof U & keyof T>
// type Masked<T, U extends Mask<T>> = {
//     [K in keyof U & keyof T]: U[K] extends Mask<T[K]> ? Masked<T[K], U[K]> : T[K]
// }
// type Masked<T, U extends Mask<T>> = {
//     [K in keyof T as U[K] extends (true | Mask<T[K]>) ? K : never]: U[K] extends Mask<T[K]> ? Masked<T[K], U[K]> : T[K]
// }

const f = <T, U extends Mask<T>>(input: T, mask: U): PickMask<T, U> => {
    return null!
}
const g = <T, U extends Mask<T>>(input: T, mask: U): OmitMask<T, U> => {
    return null!
}
// const f = <T, U extends {
//     [K in keyof T]?: true
// }>(input: T, mask: U): {
//     [K in keyof T]: U[K] extends true ? T[K] : never
// }[keyof T] => {
//     return null!
// }
const x1 = {
    a: 1,
    b: true,
    c: 'hello',
    d: {
        e: 1,
        f: true,
        g: 'hello',
    }
}
const x2 = f(x1, {
    a: 'yes',
    d: {
        e: false,
    },
    z: true,
})
type x3 = typeof x2
type x4 = typeof x2.d
const x5 = g(x1, {
    a: 'yes',
    d: {
        e: false,
    },
    z: true,
})
type x6 = typeof x5
type x7 = typeof x5.d

type u1 = {
    a: number,
    b: boolean,
    c: string,
    d: {
        e: number,
        f: boolean,
        g: string,
    }
}
type u2 = {
    a: string,
    d: {
        e: boolean,
    },
    z: true,
}
type u3 = keyof u2 & keyof u1
type u4 = Pick<u1, u3>


// const a6 = new PickParser(a1, )

const a2 = new ArrayParser(new NumberParser())
type A2p = ReturnType<typeof a2.parse>

const a3 = new EnumParser(['a', 'b', 'c'])
type A3p = ReturnType<typeof a3.parse>

const a4 = new EnumParser(['a', 'b', 'c', true, 5])
type A4p = ReturnType<typeof a4.parse>

const z1 = [new StringParser(), new NumberParser(), new BooleanParser()] as const
const a5 = new TupleParser(z1)
type A5p = ReturnType<typeof a5.parse>
const v5: [string, number, boolean] = a5.parse(['hello', 1, true])
console.log(v5)
const v5_0 = v5[0]
// const v5_3 = v5[3]

enum Foo {
    A,
    B,
    C
}

enum Bar {
    A = "A",
    B = "B",
    C = "C"
}

enum Baz {
    A = "x",
    B = "y",
    C = "z"
}

enum Qux {
    A = "x",
    B = 2,
    C = 3,
}

// enum Qux2 {
//     "0" = "x",
//     "1" = 2,
//     "2" = 3,
// }

console.log('Foo.A', Foo.A)

const a7 = new NativeEnumParser(Foo)
type A7p = ReturnType<typeof a7.parse>
const a8 = typeof Foo.A
const a9 = typeof Foo["0"]
const a10 = Foo.A
const a11 = typeof a10
const a12 = new NativeEnumParser(Bar)
type A12p = ReturnType<typeof a12.parse>
const a13 = new NativeEnumParser(Baz)
type A13p = ReturnType<typeof a13.parse>

console.log(Qux)
