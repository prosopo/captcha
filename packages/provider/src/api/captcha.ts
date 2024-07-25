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
    Captcha,
    CaptchaRequestBody,
    CaptchaResponseBody,
    CaptchaSolutionBody,
    CaptchaSolutionBodyType,
    CaptchaSolutionResponse,
    DappUserSolutionResult,
    GetPowCaptchaChallengeRequestBody,
    PowCaptchaSolutionResponse,
    SubmitPowCaptchaSolutionBody,
} from '@prosopo/types'
import { ProsopoApiError } from '@prosopo/common'
import { ProviderEnvironment } from '@prosopo/types-env'
import { Tasks } from '../tasks/tasks.js'
import { handleErrors } from './errorHandler.js'
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
        `${ApiPaths.GetImageCaptchaChallenge}/:${ApiParams.datasetId}/:${ApiParams.user}/:${ApiParams.dapp}/:${ApiParams.blockNumber}`,
        async (req, res, next) => {
            try {
                const { datasetId, user } = CaptchaRequestBody.parse(req.params)
                validateAddress(user, false, 42)

                const taskData = await tasks.imgCaptchaManager.getRandomCaptchasAndRequestHash(datasetId, user)
                const captchaResponse: CaptchaResponseBody = {
                    captchas: taskData.captchas.map((captcha: Captcha) => ({
                        ...captcha,
                        items: captcha.items.map((item) => parseCaptchaAssets(item, env.assetsResolver)),
                    })),
                    requestHash: taskData.requestHash,
                    timestamp: taskData.timestamp,
                    signedTimestamp: taskData.signedTime,
                }
                return res.json(captchaResponse)
            } catch (err) {
                tasks.logger.error(err)
                return next(new ProsopoApiError('API.BAD_REQUEST', { context: { error: err, code: 400 } }))
            }
        }
    )

    /**
     * Receives solved CAPTCHA challenges from the user, stores to database, and checks against solution commitment
     *
     * @param {string} userAccount - Dapp User id
     * @param {string} dappAccount - Dapp Contract AccountId
     * @param {Captcha[]} captchas - The Captcha solutions
     * @return {DappUserSolutionResult} - The Captcha solution result and proof
     */
    router.post(ApiPaths.SubmitImageCaptchaSolution, async (req, res, next) => {
        let parsed: CaptchaSolutionBodyType
        try {
            parsed = CaptchaSolutionBody.parse(req.body)
        } catch (err) {
            return next(new ProsopoApiError('CAPTCHA.PARSE_ERROR', { context: { code: 400, error: err } }))
        }

        try {
            // TODO allow the dapp to override the length of time that the request hash is valid for
            const result: DappUserSolutionResult = await tasks.imgCaptchaManager.dappUserSolution(
                parsed[ApiParams.user],
                parsed[ApiParams.dapp],
                parsed[ApiParams.requestHash],
                parsed[ApiParams.captchas],
                parsed[ApiParams.signature],
                parsed[ApiParams.timestamp],
                parsed[ApiParams.signedTimestamp]
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
        try {
            const { user, dapp } = GetPowCaptchaChallengeRequestBody.parse(req.body)

            const origin = req.headers.origin

            if (!origin) {
                throw new ProsopoApiError('API.BAD_REQUEST', {
                    context: { code: 400, error: 'origin header not found' },
                })
            }

            const challenge = await tasks.powCaptchaManager.getPowCaptchaChallenge(user, dapp, origin)
            return res.json(challenge)
        } catch (err) {
            tasks.logger.error(err)
            return next(new ProsopoApiError('API.BAD_REQUEST', { context: { code: 400, error: err } }))
        }
    })

    /**
     * Verifies a user's PoW solution as being approved or not
     *
     * @param {string} challenge - the challenge string
     * @param {number} difficulty - the difficulty of the challenge
     * @param {string} signature - the signature of the challenge
     * @param {string} nonce - the nonce of the challenge
     * @param {number} verifiedTimeout - the valid length of captcha solution in ms
     */
    router.post(ApiPaths.SubmitPowCaptchaSolution, async (req, res, next) => {
        try {
            const { challenge, difficulty, signature, nonce, verifiedTimeout } = SubmitPowCaptchaSolutionBody.parse(
                req.body
            )
            const verified = await tasks.powCaptchaManager.verifyPowCaptchaSolution(
                challenge,
                difficulty,
                signature,
                nonce,
                verifiedTimeout
            )
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
            await tasks.datasetManager.saveCaptchaEvent(events, accountId)
            return res.json({ status: 'success' })
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
            //temp
            return res.json({ version, ...{ message: 'HOW ARE WE GONNA GET PROVIDER DETAILS' } })
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
