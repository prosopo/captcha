import { BaseParser, Parser } from "./Parser.js"
import { PickMask } from "./utils.js"


export class PickParser<T extends {}, U extends {}> extends BaseParser<PickMask<T, U>> {

    constructor(private target: T, private mask: U) {
        super()
    }

    checkMask(target: object, mask: object) {
        for (const key of Object.keys(mask)) {
            const value = mask[key as keyof typeof mask]
            if (value !== undefined) {
                // check that the key exists in the target
                if (!(key in target)) {
                    throw new Error(`Expected key ${key} in object ${JSON.stringify(target)}`)
                }
                // if the mask has a submask, recurse
                if (typeof value === 'object') {
                    const subMask = value[key]
                    const subObj = value[key]
                    this.checkMask(subObj, subMask)
                }
            }
        }
    }

    parse(value: unknown): PickMask<T, U> {
        value = value as object // cast to obj // TODO should we be doing this? this is so given similar functionality to Pick<number, 'toString'> works
        const object = value as Record<string, unknown>
        // check the mask matches
        this.checkMask(this.target, this.mask)
        return value as PickMask<T, U>
    }
}

export const pPick = <T extends {}, U extends {}>(target: T, mask: U) => new PickParser(target, mask)

const m = pPick({ a: 1, b: true, c: 'hello', d: { e: 1, f: true, g: 'hello' } }, { a: true, d: { e: true } })
type n = ReturnType<typeof m.parse>

const a = {
    a: 1,
    b: true,
    c: 'hello',
    d: {
        e: 1,
        f: true,
        g: 'hello',
    }
}
const b = {
    a: true,
    d: {
        e: true,
    }
}
const c = new PickParser(a, b)
const d = c.parse(a)
type t = typeof d
type e = Omit<typeof a, 'b'>
type f = Pick<typeof a, 'b'>