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
import { main } from '../lib/redeploy.js'

const fluxDeployArgs = z.object({
    app: z.string(),
    ip: z.string().optional(),
    hard: z.boolean().optional(),
})

export default (cmdArgs?: { logger?: Logger }) => {
    const logger = cmdArgs?.logger || getLogger(LogLevel.enum.info, 'flux.cli.deploy')

    return {
        command: 'redeploy',
        describe: 'Deploy a Flux application',
        builder: (yargs: Argv) =>
            yargs.option('hard', {
                type: 'boolean' as const,
                demand: false,
                desc: 'Whether to hard redeploy the app',
            } as const),
        handler: async (argv: ArgumentsCamelCase) => {
            try {
                const privateKey = getPrivateKey()
                const publicKey = getPublicKey()
                const parsedArgs = fluxDeployArgs.parse(argv)
                await main(publicKey, privateKey, parsedArgs.app, parsedArgs.ip, parsedArgs.hard)
            } catch (err) {
                logger.error(err)
            }
        },
        middlewares: [],
    }
}
