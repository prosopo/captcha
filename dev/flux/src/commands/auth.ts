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
import { LogLevel, Logger, getLogger } from '@prosopo/common'
import { getPrivateKey, getPublicKey } from './process.env.js'
import { main } from '../lib/auth.js'

const fluxAuthArgs = z.object({
    app: z.string().optional(),
    ip: z.string().optional(),
})

export default (cmdArgs?: { logger?: Logger }) => {
    const logger = cmdArgs?.logger || getLogger(LogLevel.enum.info, 'flux.cli.auth')

    return {
        command: 'auth <app>',
        describe: 'Authenticate with a Flux Node',
        builder: (yargs: Argv) =>
            yargs
                .positional('app', {
                    type: 'string' as const,
                    demandOption: false,
                    desc: 'Name of the app to authenticate with. Authentication is done with api.runonflux.io by default.',
                } as const)
                .option('ip', {
                    type: 'string' as const,
                    demandOption: false,
                    desc: 'IP address of Flux node to authenticate with',
                } as const),

        handler: async (argv: ArgumentsCamelCase) => {
            try {
                const privateKey = getPrivateKey()
                const publicKey = getPublicKey()
                const parsedArgs = fluxAuthArgs.parse(argv)
                const result = await main(publicKey, privateKey, parsedArgs.app, parsedArgs.ip)
                logger.info({
                    publicKey,
                    nodeUIURL: result.nodeUIURL.href,
                    nodeAPIURL: result.nodeAPIURL.href,
                    nodeLoginPhrase: result.nodeLoginPhrase,
                    nodeSignature: result.nodeSignature,
                })
            } catch (err) {
                logger.error(err)
            }
        },
        middlewares: [],
    }
}
