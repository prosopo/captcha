import { NextFunction, Request, Response } from 'express'
import { ProviderEnvironment } from '@prosopo/types-env'
import { Tasks } from '../index.js'
import { hexToU8a, isHex } from '@polkadot/util'

export const authMiddleware = (tasks: Tasks, env: ProviderEnvironment) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { signature, blocknumber } = validateHeaders(req.headers)

            validateBlockNumber(parseInt(blocknumber), await tasks.getCurrentBlockNumber())

            validatePair(env.pair)
            validateSignature(signature, blocknumber, env.pair)

            next()
        } catch (err) {
            console.error('Auth Middleware Error:', err)
            res.status(401).json({ error: 'Unauthorized', message: err })
        }
    }
}

const validateHeaders = (headers: { [key: string]: string | string[] | undefined }) => {
    const { signature, blocknumber } = headers

    if (!signature || !blocknumber) {
        throw new Error('Missing signature or block number')
    }

    if (Array.isArray(signature) || Array.isArray(blocknumber)) {
        throw new Error('Invalid header format')
    }

    if (!isHex(signature)) {
        throw new Error('Invalid signature format')
    }

    return { signature, blocknumber }
}

const validateBlockNumber = (blockNumber: number, currentBlockNumber: number) => {
    if (isNaN(blockNumber) || blockNumber < currentBlockNumber - 500 || blockNumber > currentBlockNumber) {
        throw new Error(`Invalid block number ${blockNumber}, current block number is ${currentBlockNumber}`)
    }
}

const validatePair = (pair: any) => {
    if (!pair) {
        throw new Error('No key pair available')
    }
}

const validateSignature = (signature: string, blockNumber: string, pair: any) => {
    const u8Sig = hexToU8a(signature)

    if (!pair.verify(blockNumber, u8Sig, pair.publicKey)) {
        throw new Error('Signature verification failed')
    }
}
