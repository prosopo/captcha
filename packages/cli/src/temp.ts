// Copyright 2021-2023 Prosopo (UK) Ltd.
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
/* eslint-disable @typescript-eslint/no-var-requires */
import { ProviderEnvironment } from '@prosopo/types-env'
import { Tasks } from '@prosopo/provider'
import { encodeStringAddress } from '@prosopo/provider'
import { getLogger } from '@prosopo/common'
const yargs = require('yargs')

const validateAddress = (argv) => {
    const address = encodeStringAddress(argv.address as string)

    return { address }
}

export function processArgs(args, env: ProviderEnvironment) {
    const tasks = new Tasks(env)
    const logger = getLogger(env.config.logLevel, 'CLI')
    return yargs
        .usage('Usage: $0 [global options] <command> [options]')
        .option('api', { demand: false, default: false, type: 'boolean' })
        .command(
            'provider_details',
            'List details of a single Provider',
            (yargs) =>
                yargs.option('address', {
                    type: 'string',
                    demand: true,
                    desc: 'The AccountId of the Provider',
                }),
            async (argv) => {
                try {
                    console.log('asdfasdf\n\n\nasdasdasd\n\n\nsdkjaskdj')
                    const result = (await tasks.contract.query.getProvider(argv.address, {})).value.unwrap().unwrap()

                    logger.info('provider', JSON.stringify(result))
                } catch (err) {
                    logger.error(err)
                }
            },
            [validateAddress]
        ).argv
}
