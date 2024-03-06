import { sha256 } from '@noble/hashes/sha256'

export const solvePoW = (data: string, difficulty: number): number => {
    let nonce = 0
    const prefix = '0'.repeat(difficulty)

    // eslint-disable-next-line no-constant-condition
    while (true) {
        const message = new TextEncoder().encode(nonce + data)
        const hashHex = bufferToHex(sha256(message))

        if (hashHex.startsWith(prefix)) {
            return nonce
        }

        nonce += 1
    }
}

const bufferToHex = (buffer: Uint8Array): string =>
    Array.from(buffer)
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('')
