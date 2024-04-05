import { bool } from "./BooleanParser.js";
import { num } from "./NumberParser.js";
import { ExtractSchema, ObjectParser, SchemaHandler, UnpackSchema, obj } from "./ObjectParser.js";
import { opt } from "./OptionalParser.js";
import { IsOptional, IsReadonly, NestedParser, Parser, ReadonlyProp, Shape } from "./Parser.js";
import { ro } from "./ReadonlyParser.js";
import { str } from "./StringParser.js";


const a1 = obj({
    a: str(),
    b: num(),
    c: bool(),
    d: obj({
        e: str(),
        f: num(),
        y1: opt(bool()),
        y2: ro(bool()),
        y3: ro(opt(bool())),
    }),
    x1: opt(bool()),
    x2: ro(bool()),
    x3: ro(opt(bool())),
})
type a2 = ReturnType<typeof a1.shape>
const a3 = a1.shape({ a: "a", b: 1, c: true, d: { e: "e", f: 2, y2: true }, x2: true })
console.log(a3)

const b1 = opt(str())
type b2 = IsOptional<typeof b1>
const b3 = str()
type b4 = IsOptional<typeof b3>
const b5 = ro(str())
type b6 = IsOptional<typeof b5>
const b7 = ro(opt(str()))
type b8 = IsOptional<typeof b7>

const c1 = ro(str())
type c2 = IsReadonly<typeof c1>
const c3 = str()
type c4 = IsReadonly<typeof c3>
const c5 = opt(str())
type c6 = IsReadonly<typeof c5>
const c7 = opt(ro(str()))
type c8 = IsReadonly<typeof c7>

const d1 = new SchemaHandler({
    a: str(),
    b: num(),
    c: bool(),
    d: obj({
        e: str(),
        f: num(),
    }),
})
const d2 = d1.pick({
    a: true,
    d: {
        e: true,
    }
})
const d3 = d1.omit({
    a: true,
    d: {
        e: true,
    }
})
const d4 = d1.extend({
    g: bool(),
})
const d5 = d1.partialShallow()
const d6 = d1.readonlyShallow()
const d7 = d1.partialDeep()
const d8 = obj(d7)
type d9 = ReturnType<typeof d8.shape>
type d10<T> = {
    [K in keyof T as IsOptional<T[K]> extends true ? IsReadonly<T[K]> extends false ? K : never : never]?: T[K] extends Parser<infer U> ? U : never
}
type d11 = typeof d8
type d12 = ExtractSchema<d11>
type d13 = d10<d12>
type d14<T> = {
    [K in keyof T]: IsOptional<T[K]>
}
type d15 = d14<d12>
type IsRO<T> = T extends NestedParser<infer U> ? true: false
type d16<T> = {
    [K in keyof T]: IsRO<T[K]>
}
type d17 = d16<d12>

const e1 = obj({
    a: str(),
    b: num(),
    c: bool(),
    d: obj({
        e: str(),
        f: num(),
    }),
})
const e2 = e1.pick({
    a: true,
    d: {
        e: true,
    }
})
type e3 = ReturnType<typeof e2.shape>
const e4 = e1.omit({
    a: true,
    d: {
        e: true,
    }
})
type e5 = ReturnType<typeof e4.shape>
const e6 = e1.extend({
    g: bool(),
})
type e7 = ReturnType<typeof e6.shape>
const e8 = e1.partialShallow()
type e9 = ReturnType<typeof e8.shape>
const e10 = e1.readonlyShallow()
type e11 = ReturnType<typeof e10.shape>
const e12 = e1.readonlyShallow().partialShallow()
type e13 = ReturnType<typeof e12.shape>
const e14 = e1.partialDeep()
type e15 = ReturnType<typeof e14.shape>
const e16 = e1.readonlyDeep()
type e17 = ReturnType<typeof e16.shape>
const e18 = e1.pick({
    a: true,
    d: {
        e: true,
    }
}).readonlyShallow()
type e19 = ReturnType<typeof e18.shape>
const e20 = e1.pickPartial({
    a: true,
    d: {
        e: true,
    }
})
type e21 = ReturnType<typeof e20.shape>
const e22 = e1.pickReadonly({
    a: true,
    d: {
        e: true,
    }
})
type e23 = ReturnType<typeof e22.shape>
const e24 = e1.omitPartial({
    a: true,
    d: {
        e: true,
    }
})
type e25 = ReturnType<typeof e24.shape>
const e26 = e1.omitReadonly({
    a: true,
    d: {
        e: true,
    }
})
type e27 = ReturnType<typeof e26.shape>



const f1 = obj({
    a: str(),
    b: num(),
    c: bool(),
    d: obj({
        e: str(),
        f: num(),
    }),
})

const [ok, result] = f1.isShape({})
if (ok) {
    const value = result
} else {
    const error = result
}