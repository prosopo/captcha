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
import { formatEnvToArray } from '../lib/formatEnv.js'
import fs from 'fs'
import path from 'path'

const fluxFormatEnvArgs = z.object({
    file: z.string(),
    write: z.string().optional(),
})
export default (cmdArgs?: { logger?: Logger }) => {
    const logger = cmdArgs?.logger || getLogger(LogLevel.enum.info, 'flux.cli.getDapp')

    return {
        command: 'formatenv <file>',
        describe: 'Format an environment file to an array',
        builder: (yargs: Argv) =>
            yargs
                .positional('file', {
                    type: 'string' as const,
                    demandOption: false,
                    desc: 'Name of the dapp to get the details of',
                } as const)
                .option('--write', {
                    type: 'string' as const,
                    demandOption: false,
                    desc: 'Write the formatted env to a file',
                } as const),
        handler: async (argv: ArgumentsCamelCase) => {
            try {
                const parsedArgs = fluxFormatEnvArgs.parse(argv)

                const formattedEnv = formatEnvToArray(parsedArgs.file)

                logger.info(formattedEnv)

                if (parsedArgs.write) {
                    const writePath = path.resolve(parsedArgs.write)
                    fs.writeFileSync(writePath, formattedEnv)
                    logger.info(`Formatted env written to ${writePath}`)
                }
            } catch (err) {
                logger.error(err)
            }
        },
        middlewares: [],
    }
}
