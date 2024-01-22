import { BaseParser, Parser } from "./Parser.js"
import { OmitMask } from "./utils.js"


export class OmitParser<T extends {}, U extends {}> extends BaseParser<OmitMask<T, U>> {

    constructor(private target: T, private mask: U) {
        super()
    }

    checkMask(target: object, mask: object) {
        for (const key of Object.keys(mask)) {
            const value = mask[key as keyof typeof mask]
            if (value !== undefined) {
                // check that the key exists in the target
                if (!(key in target)) {
                    // fine, we're omitting it
                } else {
                    // TODO pass root key in recursion to provide better err msgs
                    // can't omit key that doesn't exist
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

    parse(value: unknown): OmitMask<T, U> {
        value = value as object // cast to obj // TODO should we be doing this? this is so given similar functionality to Pick<number, 'toString'> works
        const object = value as Record<string, unknown>
        // check the mask matches
        this.checkMask(this.target, this.mask)
        return value as OmitMask<T, U>
    }

}
