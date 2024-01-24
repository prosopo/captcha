import { KeyringPair } from '@polkadot/keyring/types'
import { NextFunction, Request, Response } from 'express'
import { ProsopoApiError, ProsopoEnvError } from '@prosopo/common'
import { ProviderEnvironment } from '@prosopo/types-env'
import { Tasks } from '../index.js'
import { hexToU8a, isHex } from '@polkadot/util'

export const authMiddleware = (tasks: Tasks, env: ProviderEnvironment) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { signature, blocknumber } = extractHeaders(req)

            if (!env.pair) {
                throw new ProsopoEnvError('CONTRACT.CANNOT_FIND_KEYPAIR')
            }

            verifyEnvironmentKeyPair(env)
            await verifyBlockNumber(blocknumber, tasks)
            verifySignature(signature, blocknumber, env.pair)

            next()
        } catch (err) {
            console.error('Auth Middleware Error:', err)
            res.status(401).json({ error: 'Unauthorized', message: err })
        }
    }
}

const extractHeaders = (req: Request) => {
    const signature = req.headers.signature as string
    const blocknumber = req.headers.blocknumber as string

    if (!signature || !blocknumber) {
        throw new ProsopoApiError('CONTRACT.INVALID_DATA_FORMAT', {
            context: { error: 'Missing signature or block number' },
        })
    }

    if (Array.isArray(signature) || Array.isArray(blocknumber) || !isHex(signature)) {
        throw new ProsopoApiError('CONTRACT.INVALID_DATA_FORMAT', { context: { error: 'Invalid header format' } })
    }

    return { signature, blocknumber }
}

const verifyEnvironmentKeyPair = (env: ProviderEnvironment) => {
    if (!env.pair) {
        throw new ProsopoEnvError('CONTRACT.CANNOT_FIND_KEYPAIR')
    }
}

const verifyBlockNumber = async (blockNumber: string, tasks: Tasks) => {
    const parsedBlockNumber = parseInt(blockNumber)
    const currentBlockNumber = await tasks.getCurrentBlockNumber()

    if (
        isNaN(parsedBlockNumber) ||
        parsedBlockNumber < currentBlockNumber - 500 ||
        parsedBlockNumber > currentBlockNumber
    ) {
        throw new ProsopoApiError('API.BAD_REQUEST', {
            context: {
                error: `Invalid block number ${parsedBlockNumber}, current block number is ${currentBlockNumber}`,
            },
        })
    }
}

const verifySignature = (signature: string, blockNumber: string, pair: KeyringPair) => {
    const u8Sig = hexToU8a(signature)

    if (!pair.verify(blockNumber, u8Sig, pair.publicKey)) {
        throw new ProsopoApiError('GENERAL.INVALID_SIGNATURE', { context: { error: 'Signature verification failed' } })
    }
}
