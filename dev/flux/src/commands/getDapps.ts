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
import { LogLevel, type Logger, getLogger } from '@prosopo/common'
import { getPrivateKey, getPublicKey } from './process.env.js'
import { main } from '../lib/getDapps.js'

export default (cmdArgs?: { logger?: Logger }) => {
    const logger = cmdArgs?.logger || getLogger(LogLevel.enum.info, 'flux.cli.getDapps')

    return {
        command: 'getDapps',
        describe: 'Get dapp details',
        handler: async () => {
            try {
                const privateKey = getPrivateKey()
                const publicKey = getPublicKey()
                const dapps = await main(publicKey, privateKey)
                logger.info(JSON.stringify(dapps, null, 2))
            } catch (err) {
                logger.error(err)
            }
        },
        middlewares: [],
    }
}
