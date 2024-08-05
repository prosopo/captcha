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
import * as z from 'zod'
import type { ArgumentsCamelCase, Argv } from 'yargs'
import type { Keypair } from '@polkadot/util-crypto/types'
import { LogLevel, type Logger, getLogger } from '@prosopo/common'
import { base58Decode, base64Encode } from '@polkadot/util-crypto'
import { getPrivateKey, getPublicKey } from './process.env.js'
import { sign } from '../lib/sep256k1Sign.js'
import { u8aToHex } from '@polkadot/util'
const msgSpec = z.string()

export default (cmdArgs?: { logger?: Logger }) => {
    const logger = cmdArgs?.logger || getLogger(LogLevel.enum.info, 'flux.cli.auth')

    return {
        command: 'sign <msg>',
        describe: 'Sign a message with a private key',
        builder: (yargs: Argv) =>
            yargs.positional('msg', {
                type: 'string',
                demandOption: true,
                desc: 'Message to sign',
            } as const),
        handler: async (argv: ArgumentsCamelCase) => {
            const publicKeyEncoded = getPublicKey()
            const secretKey = getPrivateKey()
            const publicKey: Uint8Array = base58Decode(publicKeyEncoded)
            const keypair: Keypair = { secretKey, publicKey }
            const message = msgSpec.parse(argv.msg)
            if (message.length === 0) {
                logger.error('No message provided')
                process.exit()
            }
            sign(message, keypair)
                .then((sig) => {
                    const hexSig = u8aToHex(sig)
                    logger.info(`Public Key: ${publicKeyEncoded}`)
                    logger.info(`Base64 Signature: ${base64Encode(hexSig)}`)
                    process.exit()
                })
                .catch((error) => {
                    logger.error(error)
                    process.exit()
                })
        },
        middlewares: [],
    }
}
