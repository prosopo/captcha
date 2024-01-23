import { pNumber } from "./NumberParser.js"
import { BaseParser, Parser } from "./Parser.js"
import { pString } from "./StringParser.js"
import { Mask, PickMask, Schema, Shape } from "./utils.js"


export class PickParser<S, T extends Parser<S>, U extends Mask<S>> extends BaseParser<PickMask<S, U>> {

    constructor(private target: T, private mask: U) {
        super()
    }

    checkMask(target: object, mask: object) {
        for (const key of Object.keys(mask)) {
            const value = mask[key as keyof typeof mask]
            if (value !== undefined) {
                // check that the key exists in the target
                // TODO pass root key in recursion to provide better err msgs
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

    parse(value: unknown): PickMask<Shape<T>, U> {
        value = value as object // cast to obj // TODO should we be doing this? this is so given similar functionality to Pick<number, 'toString'> works
        const object = value as Record<string, unknown>
        // check the mask matches
        this.checkMask(this.target, this.mask)
        return value as PickMask<Shape<T>, U>
    }
}

export const pPick = <T extends Schema, U extends {}>(target: T, mask: U) => new PickParser(target, mask)

// const a = pPick({ a: pString(), b: pNumber() }, { a: true })
// type b = ReturnType<typeof a.parse>