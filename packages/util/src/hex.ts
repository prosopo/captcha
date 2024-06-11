import { isArray } from './checks.js'
import { u8aToHex } from '@polkadot/util'

export type Hash = string | number[]

export const hashToHex = (hash: Hash) => {
    if (isArray(hash)) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return u8aToHex(new Uint8Array(hash))
    }
    return hash.toString()
}
