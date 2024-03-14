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
import { getAuth, getIndividualFluxAppDetails } from '../lib/auth.js'
import { getPrivateKey, getPublicKey } from './process.env.js'
const fluxGetDappArgs = z.object({
    app: z.string(),
})
export default (cmdArgs?: { logger?: Logger }) => {
    const logger = cmdArgs?.logger || getLogger(LogLevel.enum.info, 'flux.cli.getDapp')

    return {
        command: 'getDapp',
        describe: 'Get dapp details',
        builder: (yargs: Argv) =>
            yargs.option('app', {
                type: 'string' as const,
                demandOption: false,
                desc: 'Name of the dapp to get the details of',
            } as const),
        handler: async (argv: ArgumentsCamelCase) => {
            try {
                const privateKey = getPrivateKey()
                const publicKey = getPublicKey()
                const { signature, loginPhrase } = await getAuth(privateKey)
                const parsedArgs = fluxGetDappArgs.parse(argv)
                const dapp = await getIndividualFluxAppDetails(parsedArgs.app, publicKey, signature, loginPhrase)
                logger.info(JSON.stringify(dapp, null, 2))
            } catch (err) {
                logger.error(err)
            }
        },
        middlewares: [],
    }
}
