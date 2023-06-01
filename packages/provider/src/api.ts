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
import { CaptchaRequestBody } from '@prosopo/types'
import { CaptchaSolutionBody, CaptchaWithProof, DappUserSolutionResult, VerifySolutionBody } from '@prosopo/types'
import { ProsopoApiError } from '@prosopo/common'
import { ProsopoEnvironment } from '@prosopo/types-env'
import { Tasks } from './tasks/tasks'
import { parseBlockNumber } from './util'
import { parseCaptchaAssets } from '@prosopo/datasets'
import { validateAddress } from '@polkadot/util-crypto'
import express, { Router } from 'express'

/**
 * Returns a router connected to the database which can interact with the Proposo protocol
 *
 * @return {Router} - A middleware router that can interact with the Prosopo protocol
 * @param {Environment} env - The Prosopo environment
 */
export function prosopoRouter(env: ProsopoEnvironment): Router {
    const router = express.Router()
    const tasks = new Tasks(env)

    /**
     * Provides a Captcha puzzle to a Dapp User
     * @param {string} datasetId - Provider datasetId
     * @param {string} userAccount - Dapp User AccountId
     * @param {string} blockNumber - Block number
     * @return {Captcha} - The Captcha data
     */
    router.get(
        '/v1/prosopo/provider/captcha/:datasetId/:userAccount/:dappAccount/:blockNumber',
        async (req, res, next) => {
            try {
                const { blockNumber, datasetId, userAccount, dappAccount } = CaptchaRequestBody.parse(req.params)

                validateAddress(userAccount, false, env.api.registry.chainSS58)
                const blockNumberParsed = parseBlockNumber(blockNumber)

                await tasks.validateProviderWasRandomlyChosen(userAccount, dappAccount, datasetId, blockNumberParsed)

                const taskData = await tasks.getRandomCaptchasAndRequestHash(datasetId, userAccount)
                taskData.captchas = taskData.captchas.map((cwp: CaptchaWithProof) => ({
                    ...cwp,
                    captcha: {
                        ...cwp.captcha,
                        items: cwp.captcha.items.map((item) => parseCaptchaAssets(item, env.assetsResolver)),
                    },
                }))
                return res.json(taskData)
            } catch (err) {
                return next(new ProsopoApiError(err, undefined, 400))
            }
        }
    )

    /**
     * Receives solved CAPTCHA challenges, store to database, and check against solution commitment
     *
     * @param {string} userAccount - Dapp User id
     * @param {string} dappAccount - Dapp Contract AccountId
     * @param {Captcha[]} captchas - The Captcha solutions
     * @return {DappUserSolutionResult} - The Captcha solution result and proof
     */
    router.post('/v1/prosopo/provider/solution', async (req, res, next) => {
        let parsed
        try {
            parsed = CaptchaSolutionBody.parse(req.body)
        } catch (err) {
            return next(new ProsopoApiError(err, undefined, 400))
        }

        try {
            const result: DappUserSolutionResult = await tasks.dappUserSolution(
                parsed.userAccount,
                parsed.dappAccount,
                parsed.requestHash,
                parsed.captchas,
                parsed.signature
            )
            return res.json({
                status: req.i18n.t(result.solutionApproved ? 'API.CAPTCHA_PASSED' : 'API.CAPTCHA_FAILED'),
                ...result,
            })
        } catch (err) {
            return next(new ProsopoApiError(err, undefined, 400))
        }
    })

    /**
     * Verifies a user's solution as being approved or not
     *
     * @param {string} userAccount - Dapp User id
     * @param {string} commitmentId - The captcha solution to look up
     */
    router.post('/v1/prosopo/provider/verify', async (req, res, next) => {
        let parsed
        try {
            parsed = VerifySolutionBody.parse(req.body)
        } catch (err) {
            return next(new ProsopoApiError(err, undefined, 400))
        }
        try {
            let solution
            let statusMessage = 'API.USER_NOT_VERIFIED'
            if (!parsed.commitmentId) {
                solution = await tasks.getDappUserCommitmentByAccount(parsed.userAccount)
            } else {
                solution = await tasks.getDappUserCommitmentById(parsed.commitmentId)
            }
            if (solution) {
                if (solution.approved) {
                    statusMessage = 'API.USER_VERIFIED'
                }
                return res.json({
                    status: req.t(statusMessage),
                    solutionApproved: !!solution.approved,
                    commitmentId: solution.commitmentId,
                })
            }
            return res.json({
                status: req.t(statusMessage),
                solutionApproved: false,
            })
        } catch (err) {
            return next(new ProsopoApiError(err, undefined, 400))
        }
    })

    return router
}
