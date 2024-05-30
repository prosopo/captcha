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
import { ArgumentsCamelCase, Argv } from 'yargs'
import { Keypair } from '@polkadot/util-crypto/types'
import { LogLevel, Logger, getLogger } from '@prosopo/common'
import { base58Decode, base64Encode } from '@polkadot/util-crypto'
import { sign, wifToPrivateKey } from '../lib/sep256k1Sign.js'
import { u8aToHex } from '@polkadot/util'
const msgSpec = z.string()

export default (cmdArgs?: { logger?: Logger }) => {
    const logger = cmdArgs?.logger || getLogger(LogLevel.enum.info, 'flux.cli.auth')

    return {
        command: 'sign',
        describe: 'Sign a message with a private key',
        builder: (yargs: Argv) =>
            yargs.option('msg', {
                type: 'string',
                demandOption: true,
                desc: 'Message to sign',
            } as const),
        handler: async (argv: ArgumentsCamelCase) => {
            const secretKey = wifToPrivateKey(process.env.PROSOPO_ZELCORE_PRIVATE_KEY || '')
            const publicKey: Uint8Array = base58Decode(process.env.PROSOPO_ZELCORE_PUBLIC_KEY || '')
            const keypair: Keypair = { secretKey, publicKey }
            const message = msgSpec.parse(argv.msg)
            if (message.length === 0) {
                console.error('No message provided')
                process.exit()
            }
            sign(message, keypair)
                .then((sig) => {
                    const hexSig = u8aToHex(sig)
                    logger.info(`Hex Signature   : ${hexSig}`)
                    logger.info(`Public Key: ${publicKey}`)
                    logger.info(`Base64 Signature: ${base64Encode(hexSig)}`)
                    process.exit()
                })
                .catch((error) => {
                    console.error(error)
                    process.exit()
                })
        },
        middlewares: [],
    }
}
