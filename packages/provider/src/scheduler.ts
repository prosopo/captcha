// Copyright 2021-2022 Prosopo (UK) Ltd.
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
// [object Object]
// SPDX-License-Identifier: Apache-2.0
import { BatchCommitmentsTask } from './batch/commitments'
import { CalculateSolutionsTask } from './tasks/calculateSolutions'
import { CronJob } from 'cron'
import { KeyringPair } from '@polkadot/keyring/types'
import { ProsopoConfig } from '@prosopo/types'
import { ProsopoEnvError } from '@prosopo/common'
import { ProviderEnvironment } from '@prosopo/env'

export async function calculateSolutionsScheduler(pair: KeyringPair, config: ProsopoConfig) {
    const env = new ProviderEnvironment(pair, config)
    await env.isReady()
    const tasks = new CalculateSolutionsTask(env)
    const job = new CronJob(process.argv[2], () => {
        env.logger.debug('CalculateSolutionsTask....')
        tasks.run().catch((err) => {
            env.logger.error(err)
        })
    })

    job.start()
}

export async function batchCommitScheduler(pair: KeyringPair, config: ProsopoConfig) {
    const env = new ProviderEnvironment(pair, config)
    await env.isReady()
    if (env.db === undefined) {
        throw new ProsopoEnvError('DATABASE.DATABASE_UNDEFINED')
    }
    const tasks = new BatchCommitmentsTask(config.batchCommit, env.contractInterface, env.db, 0n, env.logger)
    const job = new CronJob(process.argv[2], () => {
        env.logger.debug('BatchCommitmentsTask....')
        tasks.run().catch((err) => {
            env.logger.error(err)
        })
    })

    job.start()
}
