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
    ImageVerificationResponse,
    ServerPowCaptchaVerifyRequestBody,
    VerificationResponse,
    VerifySolutionBody,
} from '@prosopo/types'
import { CaptchaStatus } from '@prosopo/captcha-contract/types-returns'
import { ProsopoApiError } from '@prosopo/common'
import { ProviderEnvironment } from '@prosopo/types-env'
import { Tasks } from '../tasks/tasks.js'
import { decodeProcaptchaOutput } from '@prosopo/types'
import { getBlockTimeMs, getCurrentBlockNumber } from '@prosopo/contract'
import { handleErrors } from './errorHandler.js'
import { verifySignature } from './authMiddleware.js'
import express, { NextFunction, Request, Response, Router } from 'express'

/**
 * Returns a router connected to the database which can interact with the Proposo protocol
 *
 * @return {Router} - A middleware router that can interact with the Prosopo protocol
 * @param {Environment} env - The Prosopo environment
 */
export function prosopoVerifyRouter(env: ProviderEnvironment): Router {
    const router = express.Router()
    const tasks = new Tasks(env)

    /**
     * Verifies a solution and returns the verification response.
     * @param {Response} res - Express response object.
     * @param {Request} req - Express request object.
     * @param {NextFunction} next - Express next function.
     * @param {boolean} isDapp - Indicates whether the verification is for a dapp (true) or user (false).
     */
    async function verifyImageSolution(res: Response, req: Request, next: NextFunction, isDapp: boolean) {
        const parsed = VerifySolutionBody.parse(req.body)
        try {
            const { dappUserSignature, token } = parsed
            const { user, dapp, blockNumber, commitmentId } = decodeProcaptchaOutput(token)

            // Verify using the appropriate pair based on isDapp flag
            const keyPair = isDapp ? env.keyring.addFromAddress(dapp) : env.keyring.addFromAddress(user)

            // Will throw an error if the signature is invalid
            verifySignature(dappUserSignature, blockNumber.toString(), keyPair)

            const solution = await (commitmentId
                ? tasks.getDappUserCommitmentById(commitmentId)
                : tasks.getDappUserCommitmentByAccount(user))

            // No solution exists
            if (!solution) {
                tasks.logger.debug('Not verified - no solution found')
                const noSolutionResponse: VerificationResponse = {
                    [ApiParams.status]: req.t('API.USER_NOT_VERIFIED_NO_SOLUTION'),
                    [ApiParams.verified]: false,
                }
                return res.json(noSolutionResponse)
            }

            // A solution exists but is disapproved
            if (solution.status === CaptchaStatus.disapproved) {
                const disapprovedResponse: VerificationResponse = {
                    [ApiParams.status]: req.t('API.USER_NOT_VERIFIED'),
                    [ApiParams.verified]: false,
                }
                return res.json(disapprovedResponse)
            }

            // Check if solution was completed recently
            if (parsed.maxVerifiedTime) {
                const currentBlockNumber = await getCurrentBlockNumber(tasks.contract.api)
                const blockTimeMs = getBlockTimeMs(tasks.contract.api)
                const timeSinceCompletion = (currentBlockNumber - solution.completedAt) * blockTimeMs
                // A solution exists but has timed out
                if (timeSinceCompletion > parsed.maxVerifiedTime) {
                    const expiredResponse: VerificationResponse = {
                        [ApiParams.status]: req.t('API.USER_NOT_VERIFIED_TIME_EXPIRED'),
                        [ApiParams.verified]: false,
                    }
                    tasks.logger.debug('Not verified - time run out')
                    return res.json(expiredResponse)
                }
            }

            const isApproved = solution.status === CaptchaStatus.approved
            const response: ImageVerificationResponse = {
                [ApiParams.status]: req.t(isApproved ? 'API.USER_VERIFIED' : 'API.USER_NOT_VERIFIED'),
                [ApiParams.verified]: isApproved,
                [ApiParams.commitmentId]: solution.id.toString(),
                [ApiParams.blockNumber]: solution.requestedAt,
            }
            return res.json(response)
        } catch (err) {
            return next(new ProsopoApiError('API.BAD_REQUEST', { context: { code: 400, error: err } }))
        }
    }

    /**
     * Verifies a dapp's solution as being approved or not
     *
     * @param {string} user - Dapp User AccountId
     * @param {string} dapp - Dapp Contract AccountId
     * @param {string} blockNumber - The block number at which the captcha was requested
     * @param {string} dappUserSignature - The signature fo dapp user
     * @param {string} commitmentId - The captcha solution to look up
     * @param {number} maxVerifiedTime - The maximum time in milliseconds since the blockNumber
     */
    router.post(ApiPaths.VerifyImageCaptchaSolutionDapp, async (req, res, next) => {
        try {
            await verifyImageSolution(res, req, next, true)
        } catch (err) {
            return next(new ProsopoApiError('CAPTCHA.PARSE_ERROR', { context: { code: 400, error: err } }))
        }
    })

    /**
     * Verifies a user's solution as being approved or not
     *
     * @param {string} user - Dapp User AccountId
     * @param {string} dapp - Dapp Contract AccountId
     * @param {string} blockNumber - The block number at which the captcha was requested
     * @param {string} dappUserSignature - The signature for dapp user
     * @param {string} commitmentId - The captcha solution to look up
     * @param {number} maxVerifiedTime - The maximum time in milliseconds since the blockNumber
     */
    router.post(ApiPaths.VerifyImageCaptchaSolutionUser, async (req, res, next) => {
        try {
            await verifyImageSolution(res, req, next, false)
        } catch (err) {
            return next(new ProsopoApiError('CAPTCHA.PARSE_ERROR', { context: { code: 400, error: err } }))
        }
    })

    /**
     * Verifies a dapp's solution as being approved or not
     *
     * @param {string} dappAccount - Dapp User id
     * @param {string} challenge - The captcha solution to look up
     */
    router.post(ApiPaths.VerifyPowCaptchaSolution, async (req, res, next) => {
        try {
            const { token, dappSignature, verifiedTimeout } = ServerPowCaptchaVerifyRequestBody.parse(req.body)

            const { dapp, blockNumber, challenge } = decodeProcaptchaOutput(token)

            if (!challenge) {
                const unverifiedResponse: VerificationResponse = {
                    status: req.t('API.USER_NOT_VERIFIED'),
                    [ApiParams.verified]: false,
                }
                return res.json(unverifiedResponse)
            }

            // Verify using the dapp pair passed in the request
            const dappPair = env.keyring.addFromAddress(dapp)

            // Will throw an error if the signature is invalid
            verifySignature(dappSignature, blockNumber.toString(), dappPair)

            const approved = await tasks.serverVerifyPowCaptchaSolution(dapp, challenge, verifiedTimeout)

            const verificationResponse: VerificationResponse = {
                status: req.t(approved ? 'API.USER_VERIFIED' : 'API.USER_NOT_VERIFIED'),
                [ApiParams.verified]: approved,
            }

            return res.json(verificationResponse)
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
