import { BN_BE_256_OPTS } from '@polkadot/util-crypto/bn'
import { Keypair } from '@polkadot/util-crypto/types'
import { at } from '@prosopo/util'
import { base58Decode, base64Encode, cryptoWaitReady, sha256AsU8a } from '@polkadot/util-crypto'
import { bnToU8a, hexToU8a, u8aConcat, u8aToHex } from '@polkadot/util'
import { isMain } from '@prosopo/util'
import { loadEnv } from '@prosopo/cli'
import { secp256k1 } from '@noble/curves/secp256k1'
import varuint from 'varuint-bitcoin'

loadEnv()
const MESSAGE_MAGIC = '\u0018Bitcoin Signed Message:\n'

function hash256(buffer: Buffer) {
    return Buffer.from(sha256AsU8a(sha256AsU8a(buffer)))
}

function hasher(message: string, messagePrefix: string): Buffer {
    messagePrefix = messagePrefix || '\u0018Bitcoin Signed Message:\n'
    const messagePrefixBuffer = Buffer.from(messagePrefix, 'utf8')
    const messageBuffer = Buffer.from(message, 'utf8')
    const messageVISize = varuint.encodingLength(messageBuffer.length)
    const buffer = Buffer.allocUnsafe(messagePrefix.length + messageVISize + messageBuffer.length)
    messagePrefixBuffer.copy(buffer, 0)
    varuint.encode(messageBuffer.length, buffer, messagePrefixBuffer.length)
    messageBuffer.copy(buffer, messagePrefixBuffer.length + messageVISize)
    return hash256(buffer)
}

export async function sign(message: string, { secretKey }: Partial<Keypair>) {
    if (!secretKey) throw new Error('No secret key provided')
    await cryptoWaitReady()
    const data: Buffer = hasher(message, MESSAGE_MAGIC)
    const signature = secp256k1.sign(data, secretKey)
    return u8aConcat(
        // add 4 for compressed and then 27 for the 27th recovery byte
        Buffer.alloc(1, signature.recovery + 4 + 27),
        bnToU8a(signature.r, BN_BE_256_OPTS),
        bnToU8a(signature.s, BN_BE_256_OPTS)
    )
}

// https://bitcoin.stackexchange.com/a/61972
// <version><key><compression?><first 4 bytes of double sha256>
// 0x80..................................................................6430148d
//     ..................................................................
export function wifToPrivateKey(wif: string): Uint8Array {
    let substractLength: number

    if (wif.length === 51) {
        // compression not included
        substractLength = 8 // remove 4 bytes from WIF so 8 in hex
    } else if (wif.length === 52) {
        // compression included
        substractLength = 10 // remove 5 bytes from WIF so 10 in hex
    } else {
        throw new Error('Invalid WIF')
    }
    const secretKeyHexLong = u8aToHex(base58Decode(wif))
    // remove 0x and the version byte prefix 80 from the start. Remove the Compression Byte suffix and the Checksum from
    // the end
    const secretKeyHex = `0x${secretKeyHexLong.substring(4, secretKeyHexLong.length - substractLength)}`
    return hexToU8a(secretKeyHex)
}

// if main process
if (isMain(import.meta.url)) {
    const secretKey = wifToPrivateKey(process.env.PROSOPO_ZELCORE_PRIVATE_KEY || '')
    const publicKey: Uint8Array = base58Decode(process.env.PROSOPO_ZELCORE_PUBLIC_KEY || '')
    const keypair: Keypair = { secretKey, publicKey }
    const message = at(process.argv.slice(2), 0).trim()
    if (message.length === 0) {
        console.error('No message provided')
        process.exit()
    }
    sign(message, keypair)
        .then((sig) => {
            const hexSig = u8aToHex(sig)
            console.log(`Hex signature   : ${hexSig}`)
            console.log(`Base64 signature: ${base64Encode(hexSig)}`)
            process.exit()
        })
        .catch((error) => {
            console.error(error)
            process.exit()
        })
}
