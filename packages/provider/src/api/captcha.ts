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
import {
    ApiParams,
    ApiPaths,
    CaptchaRequestBody,
    CaptchaResponseBody,
    CaptchaSolutionBody,
    CaptchaSolutionBodyType,
    CaptchaSolutionResponse,
    CaptchaWithProof,
    DappUserSolutionResult,
    GetPowCaptchaChallengeBody,
    GetPowCaptchaChallengeBodyType,
    PowCaptchaSolutionResponse,
    SubmitPowCaptchaSolutionBody,
} from '@prosopo/types'
import { ProsopoApiError } from '@prosopo/common'
import { ProviderEnvironment } from '@prosopo/types-env'
import { Tasks } from '../tasks/tasks.js'
import { handleErrors } from './errorHandler.js'
import { parseBlockNumber } from '../util.js'
import { parseCaptchaAssets } from '@prosopo/datasets'
import { validateAddress } from '@polkadot/util-crypto/address'
import { version } from '@prosopo/util'
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

                // await tasks.validateProviderWasRandomlyChosen(user, dapp, datasetId, blockNumberParsed)

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
                tasks.logger.error(err)
                return next(new ProsopoApiError('API.BAD_REQUEST', { context: { error: err, code: 400 } }))
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
            return next(new ProsopoApiError('CAPTCHA.PARSE_ERROR', { context: { code: 400, error: err } }))
        }

        try {
            const result: DappUserSolutionResult = await tasks.dappUserSolution(
                parsed[ApiParams.user],
                parsed[ApiParams.dapp],
                parsed[ApiParams.requestHash],
                parsed[ApiParams.captchas],
                parsed[ApiParams.signature]
            )
            const returnValue: CaptchaSolutionResponse = {
                status: req.i18n.t(result.verified ? 'API.CAPTCHA_PASSED' : 'API.CAPTCHA_FAILED'),
                ...result,
            }
            return res.json(returnValue)
        } catch (err) {
            tasks.logger.error(err)
            return next(new ProsopoApiError('API.UNKNOWN', { context: { code: 400, error: err } }))
        }
    })

    /**
     * Supplies a PoW challenge to a Dapp User
     *
     * @param {string} userAccount - User address
     * @param {string} dappAccount - Dapp address
     */
    router.post(ApiPaths.GetPowCaptchaChallenge, async (req, res, next) => {
        let parsed: GetPowCaptchaChallengeBodyType
        try {
            parsed = GetPowCaptchaChallengeBody.parse(req.body)
        } catch (err) {
            return next(new ProsopoApiError('CAPTCHA.PARSE_ERROR', { context: { code: 400, error: err } }))
        }
        try {
            const origin = req.headers.origin

            if (!origin) {
                throw new ProsopoApiError('API.BAD_REQUEST', {
                    context: { code: 400, error: 'origin header not found' },
                })
            }

            const challenge = await tasks.getPowCaptchaChallenge(parsed[ApiParams.user], parsed[ApiParams.dapp], origin)
            return res.json(challenge)
        } catch (err) {
            tasks.logger.error(err)
            return next(new ProsopoApiError('API.BAD_REQUEST', { context: { code: 400, error: err } }))
        }
    })

    /**
     * Verifies a user's PoW solution as being approved or not
     *
     * @param {string} blocknumber - the block number at which the captcha was requested
     * @param {string} challenge - the challenge string
     * @param {number} difficulty - the difficulty of the challenge
     * @param {string} signature - the signature of the challenge
     * @param {string} nonce - the nonce of the challenge
     */
    router.post(ApiPaths.SubmitPowCaptchaSolution, async (req, res, next) => {
        try {
            const { blockNumber, challenge, difficulty, signature, nonce } = SubmitPowCaptchaSolutionBody.parse(
                req.body
            )
            const verified = await tasks.verifyPowCaptchaSolution(blockNumber, challenge, difficulty, signature, nonce)
            const response: PowCaptchaSolutionResponse = { verified }
            return res.json(response)
        } catch (err) {
            tasks.logger.error(err)
            return next(new ProsopoApiError('API.BAD_REQUEST', { context: { code: 400, error: err } }))
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
            tasks.logger.error(err)
            return next(new ProsopoApiError('API.BAD_REQUEST', { context: { code: 400, error: err } }))
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
            tasks.logger.error(err)
            return next(new ProsopoApiError('API.BAD_REQUEST', { context: { code: 400, error: err } }))
        }
    })

    /**
     * Gets public details of the provider
     */
    router.get(ApiPaths.GetProviderDetails, async (req, res, next) => {
        try {
            const details = await tasks.getProviderDetails()
            return res.json({ version, ...details })
        } catch (err) {
            tasks.logger.error(err)
            return next(new ProsopoApiError('API.BAD_REQUEST', { context: { code: 400, error: err } }))
        }
    })

    // Your error handler should always be at the end of your application stack. Apparently it means not only after all
    // app.use() but also after all your app.get() and app.post() calls.
    // https://stackoverflow.com/a/62358794/1178971
    router.use(handleErrors)

    return router
}
