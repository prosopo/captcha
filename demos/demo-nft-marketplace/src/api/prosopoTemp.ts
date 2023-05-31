import { AbiMessage } from '@polkadot/api-contract/types'
import { AnyJson } from '@polkadot/types/types/codec'
import { blake2AsU8a } from '@polkadot/util-crypto'
import { isHex, isU8a } from '@polkadot/util'

export abstract class AsyncFactory {
    constructor() {
        throw new Error('Use `create` factory method')
    }

    public static async create(...args: any[]) {
        return await Object.create(this.prototype).init(...args)
    }

    public abstract init(...args: any[]): Promise<this>
}

/** Encodes arguments that should be hashes using blake2AsU8a
 * @return encoded arguments
 */
export function encodeStringArgs<T>(methodObj: AbiMessage, args: T[]): T[] {
    const encodedArgs: T[] = []
    // args must be in the same order as methodObj['args']
    const typesToHash = ['Hash']
    methodObj.args.forEach((methodArg, idx) => {
        const argVal = args[idx]
        // hash values that have been passed as strings
        if (typesToHash.indexOf(methodArg.type.type) > -1 && !(isU8a(argVal) || isHex(argVal))) {
            encodedArgs.push(blake2AsU8a(argVal as unknown as string) as unknown as T)
        } else {
            encodedArgs.push(argVal)
        }
    })
    return encodedArgs
}

/** Unwrap a query respons from a contract
 * @return {AnyJson} unwrapped
 */
export function unwrap(item: AnyJson): AnyJson {
    const prop = 'Ok'
    if (item && typeof item === 'object') {
        if (prop in item) {
            return item[prop]
        }
    }
    return item
}
