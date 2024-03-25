// Copyright 2021-2024 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import type { KeyringPair } from '@polkadot/keyring/types'
import { hexToU8a, isHex } from '@polkadot/util'
import { ProsopoApiError, ProsopoEnvError } from '@prosopo/common'
import type { ProviderEnvironment } from '@prosopo/types-env'
import type { NextFunction, Request, Response } from 'express'
import type { Tasks } from '../index.js'

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
    const parsedBlockNumber = Number.parseInt(blockNumber)
    const currentBlockNumber = await tasks.getCurrentBlockNumber()

    if (
        Number.isNaN(parsedBlockNumber) ||
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
