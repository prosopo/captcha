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
import {
    ApiParams,
    ApiPaths,
    CaptchaResponseBody,
    CaptchaSolutionBody,
    CaptchaWithProof,
    DappUserSolutionResult,
    VerifySolutionBody,
} from '@prosopo/types'
import { CaptchaRequestBody } from '@prosopo/types'
import { CaptchaSolutionBodyType, VerifySolutionBodyType } from '@prosopo/types'
import { CaptchaStatus } from '@prosopo/captcha-contract/types-returns'
import { ProsopoApiError } from '@prosopo/common'
import { ProviderEnvironment } from '@prosopo/types-env'
import { Tasks } from '../tasks/tasks.js'
import { parseBlockNumber } from '../util.js'
import { parseCaptchaAssets } from '@prosopo/datasets'
import { validateAddress } from '@polkadot/util-crypto/address'
import express, { Router } from 'express'

/**
 * Returns a router connected to the database which can interact with the Proposo protocol
 *
 * @return {Router} - A middleware router that can interact with the Prosopo protocol
 * @param {Environment} env - The Prosopo environment
 */
export function prosopoRouter(env: ProviderEnvironment): Router {
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
        `${ApiPaths.GetCaptchaChallenge}/:${ApiParams.datasetId}/:${ApiParams.user}/:${ApiParams.dapp}/:${ApiParams.blockNumber}`,
        async (req, res, next) => {
            try {
                const { blockNumber, datasetId, user, dapp } = CaptchaRequestBody.parse(req.params)
                const api = env.api
                if (api === undefined) {
                    throw new ProsopoApiError('DEVELOPER.METHOD_NOT_IMPLEMENTED', {
                        context: { error: 'api not setup', env },
                    })
                }
                validateAddress(user, false, api.registry.chainSS58)
                const blockNumberParsed = parseBlockNumber(blockNumber)

                await tasks.validateProviderWasRandomlyChosen(user, dapp, datasetId, blockNumberParsed)

                const taskData = await tasks.getRandomCaptchasAndRequestHash(datasetId, user)
                const captchaResponse: CaptchaResponseBody = {
                    captchas: taskData.captchas.map((cwp: CaptchaWithProof) => ({
                        ...cwp,
                        captcha: {
                            ...cwp.captcha,
                            items: cwp.captcha.items.map((item) => parseCaptchaAssets(item, env.assetsResolver)),
                        },
                    })),
                    requestHash: taskData.requestHash,
                }
                return res.json(captchaResponse)
            } catch (err) {
                return next(new ProsopoApiError('API.BAD_REQUEST', { context: { error: err, errorCode: 400 } }))
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
    router.post(ApiPaths.SubmitCaptchaSolution, async (req, res, next) => {
        let parsed: CaptchaSolutionBodyType
        try {
            parsed = CaptchaSolutionBody.parse(req.body)
        } catch (err) {
            return next(new ProsopoApiError('CAPTCHA.PARSE_ERROR', { context: { errorCode: 400, error: err } }))
        }

        try {
            const result: DappUserSolutionResult = await tasks.dappUserSolution(
                parsed[ApiParams.user],
                parsed[ApiParams.dapp],
                parsed[ApiParams.requestHash],
                parsed[ApiParams.captchas],
                parsed[ApiParams.signature]
            )
            return res.json({
                status: req.i18n.t(result.solutionApproved ? 'API.CAPTCHA_PASSED' : 'API.CAPTCHA_FAILED'),
                ...result,
            })
        } catch (err) {
            return next(new ProsopoApiError('API.UNKNOWN', { context: { errorCode: 400, error: err } }))
        }
    })

    /**
     * Verifies a user's solution as being approved or not
     *
     * @param {string} user - Dapp User id
     * @param {string} commitmentId - The captcha solution to look up
     * @param {number} maxVerifiedTime - The maximum time in milliseconds since the blockNumber
     */
    router.post(ApiPaths.VerifyCaptchaSolution, async (req, res, next) => {
        let parsed: VerifySolutionBodyType
        try {
            parsed = VerifySolutionBody.parse(req.body)
        } catch (err) {
            return next(new ProsopoApiError('CAPTCHA.PARSE_ERROR', { context: { errorCode: 400, error: err } }))
        }
        try {
            const solution = await (parsed.commitmentId
                ? tasks.getDappUserCommitmentById(parsed.commitmentId)
                : tasks.getDappUserCommitmentByAccount(parsed.user))

            if (!solution) {
                return res.json({ status: req.t('API.USER_NOT_VERIFIED'), solutionApproved: false })
            }

            if (parsed.maxVerifiedTime) {
                const currentBlockNumber = await tasks.getCurrentBlockNumber()
                const blockTimeMs = await tasks.getBlockTimeMs()
                const timeSinceCompletion = (currentBlockNumber - solution.completedAt) * blockTimeMs

                if (timeSinceCompletion > parsed.maxVerifiedTime) {
                    return res.json({ status: req.t('API.USER_NOT_VERIFIED'), solutionApproved: false })
                }
            }

            const isApproved = solution.status === CaptchaStatus.approved
            return res.json({
                status: req.t(isApproved ? 'API.USER_VERIFIED' : 'API.USER_NOT_VERIFIED'),
                solutionApproved: isApproved,
                commitmentId: solution.id,
            })
        } catch (err) {
            return next(new ProsopoApiError('API.BAD_REQUEST', { context: { errorCode: 400, error: err } }))
        }
    })

    /**
     * Receives user events, store to database
     *
     * @param {StoredEvents}
     * @param {string} accountId - Dapp User id
     */
    router.post(ApiPaths.SubmitUserEvents, async (req, res, next) => {
        try {
            const { events, accountId } = req.body
            await tasks.saveCaptchaEvent(events, accountId)
            return res.json({ status: 'success' })
        } catch (err) {
            return next(new ProsopoApiError('API.BAD_REQUEST', { context: { errorCode: 400, error: err } }))
        }
    })

    /**
     * Verifies that the provider is running and registered in the contract
     */
    router.get(ApiPaths.GetProviderStatus, async (req, res, next) => {
        try {
            const status = await tasks.providerStatus()
            return res.json({ status })
        } catch (err) {
            return next(new ProsopoApiError('API.BAD_REQUEST', { context: { errorCode: 400, error: err } }))
        }
    })

    /**
     * Gets public details of the provider
     */
    router.get(ApiPaths.GetProviderDetails, async (req, res, next) => {
        try {
            const details = await tasks.getProviderDetails()
            return res.json(details)
        } catch (err) {
            return next(new ProsopoApiError('API.BAD_REQUEST', { context: { errorCode: 400, error: err } }))
        }
    })

    return router
}
