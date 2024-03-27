import { ProsopoEnvError, getLogger } from '@prosopo/common'
import { captchaSort } from '@prosopo/datasets'
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
import { CaptchaStates } from '@prosopo/types'
import { ScheduledTaskNames } from '@prosopo/types'
import type { ProviderEnvironment } from '@prosopo/types-env'
import { calculateNewSolutions, checkIfTaskIsRunning, updateSolutions } from '../util.js'
import { Tasks } from './tasks.js'
export class CalculateSolutionsTask extends Tasks {
    constructor(env: ProviderEnvironment) {
        super(env)
        this.logger = getLogger(env.config.logLevel, 'CalculateSolutionsTask')
    }

    /**
     * Apply new captcha solutions to captcha dataset and recalculate merkle tree
     */
    async run(): Promise<number> {
        try {
            const taskRunning = await checkIfTaskIsRunning(ScheduledTaskNames.CalculateSolution, this.db)
            if (!taskRunning) {
                // Get the current datasetId from the contract
                const provider = (await this.contract.methods.getProvider(this.contract.pair.address, {})).value
                    .unwrap()
                    .unwrap()

                // Get any unsolved CAPTCHA challenges from the database for this datasetId
                const unsolvedCaptchas = await this.db.getAllCaptchasByDatasetId(
                    provider.datasetId.toString(),
                    CaptchaStates.Unsolved
                )

                // edge case when a captcha dataset contains no unsolved CAPTCHA challenges
                if (!unsolvedCaptchas) {
                    return 0
                }

                // Sort the unsolved CAPTCHA challenges by their captchaId
                const unsolvedSorted = unsolvedCaptchas.sort(captchaSort)
                this.logger.info(`There are ${unsolvedSorted.length} unsolved CAPTCHA challenges`)

                // Get the solution configuration from the config file
                const requiredNumberOfSolutions = this.captchaSolutionConfig.requiredNumberOfSolutions
                const winningPercentage = this.captchaSolutionConfig.solutionWinningPercentage
                const winningNumberOfSolutions = Math.round(requiredNumberOfSolutions * (winningPercentage / 100))
                if (unsolvedSorted && unsolvedSorted.length > 0) {
                    const captchaIds = unsolvedSorted.map((captcha) => captcha.captchaId)
                    const solutions = (await this.db.getAllDappUserSolutions(captchaIds)) || []
                    const solutionsToUpdate = calculateNewSolutions(solutions, winningNumberOfSolutions)
                    if (solutionsToUpdate.rows().length > 0) {
                        this.logger.info(
                            `There are ${solutionsToUpdate.rows().length} CAPTCHA challenges to update with solutions`
                        )
                        try {
                            // TODO polars doesn't have the captchaId field in the type
                            const captchaIdsToUpdate = [...(solutionsToUpdate as any).captchaId.values()]
                            const commitmentIds = solutions
                                .filter((s) => captchaIdsToUpdate.indexOf(s.captchaId) > -1)
                                .map((s) => s.commitmentId)
                            const dataset = await this.db.getDataset(provider.datasetId.toString())
                            dataset.captchas = updateSolutions(solutionsToUpdate, dataset.captchas, this.logger)
                            // store new solutions in database
                            await this.providerSetDataset(dataset)
                            // mark user solutions as used to calculate new solutions
                            await this.db.flagProcessedDappUserSolutions(captchaIdsToUpdate)
                            // mark user commitments as used to calculate new solutions
                            await this.db.flagProcessedDappUserCommitments(commitmentIds)
                            // remove old captcha challenges from database
                            await this.db.removeCaptchas(captchaIdsToUpdate)
                            return solutionsToUpdate.rows().length
                        } catch (error) {
                            this.logger.error(error)
                        }
                    }
                    return 0
                }
                this.logger.info('There are no CAPTCHA challenges that require their solutions to be updated')
                return 0
            }
            return 0
        } catch (error) {
            throw new ProsopoEnvError('GENERAL.CALCULATE_CAPTCHA_SOLUTION', { context: { error } })
        }
    }
}
