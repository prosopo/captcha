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
import { ApiPaths, VerifySolutionBody, decodeProcaptchaOutput } from '@prosopo/types'
import { ProsopoApiError } from '@prosopo/common'
import { VerifySolutionBodyTypeOutput } from '@prosopo/types'
import express, { Router } from 'express'

/**
 * Returns a router connected to the database which can interact with the Proposo protocol
 *
 * @return {Router} - A middleware router that can interact with the Prosopo protocol
 */
export function prosopoRouter(): Router {
    const router = express.Router()

    /**
     * Verifies a user's solution as being approved or not
     *
     * @param {string} userAccount - Dapp User id
     * @param {string} commitmentId - The captcha solution to look up
     */
    router.post(ApiPaths.VerifyCaptchaSolutionDapp, async (req, res, next) => {
        let body: VerifySolutionBodyTypeOutput
        try {
            body = VerifySolutionBody.parse(req.body)
        } catch (err) {
            return next(
                new ProsopoApiError('CAPTCHA.PARSE_ERROR', {
                    context: { error: err, errorCode: 400 },
                    logLevel: 'info',
                })
            )
        }
        try {
            const { token } = body
            const { user, dapp, commitmentId } = decodeProcaptchaOutput(token)
            const testCommitmentId = '0x123456789test'
            const testAccount = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
            const testDapp = '5C4hrfjw9DjXZTzV3MwzrrAr9P1MJhSrvWGWqi1eSuyUpnhM'
            let statusMessage = 'API.USER_NOT_VERIFIED'
            let approved = false
            if (
                (user && user === testAccount) ||
                (commitmentId && commitmentId === testCommitmentId) ||
                (dapp && dapp === testDapp)
            ) {
                approved = true
                statusMessage = 'API.USER_VERIFIED'
                return res.json({
                    status: req.t(statusMessage),
                    verified: approved,
                    commitmentId: testCommitmentId,
                })
            }

            return res.json({
                status: req.t(statusMessage),
                verified: false,
            })
        } catch (err) {
            return next(new ProsopoApiError('API.UNKNOWN', { context: { error: err, errorCode: 500 } }))
        }
    })

    return router
}
