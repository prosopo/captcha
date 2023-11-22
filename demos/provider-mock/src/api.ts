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
import { ApiPaths, VerifySolutionBody } from '@prosopo/types'
import { ProsopoApiError } from '@prosopo/common'
import { VerifySolutionBodyType } from '@prosopo/types'
import express, { Router } from 'express'

/**
 * Returns a router connected to the database which can interact with the Proposo protocol
 *
 * @return {Router} - A middleware router that can interact with the Prosopo protocol
 * @param {Environment} env - The Prosopo environment
 */
export function prosopoRouter(): Router {
    const router = express.Router()

    /**
     * Verifies a user's solution as being approved or not
     *
     * @param {string} userAccount - Dapp User id
     * @param {string} commitmentId - The captcha solution to look up
     */
    router.post(ApiPaths.VerifyCaptchaSolution, async (req, res, next) => {
        let parsed: VerifySolutionBodyType
        try {
            parsed = VerifySolutionBody.parse(req.body)
        } catch (err) {
            // TODO fix error handling
            console.log('parsing error')
            return next(new ProsopoApiError(err as Error, undefined, 400))
        }
        try {
            const testCommitmentId = '0x123456789test'
            const testAccount = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
            let statusMessage = 'API.USER_NOT_VERIFIED'
            let approved = false
            if (
                (parsed.user && parsed.user === testAccount) ||
                (parsed.commitmentId && parsed.commitmentId === testCommitmentId)
            ) {
                approved = true
                statusMessage = 'API.USER_VERIFIED'
                return res.json({
                    status: req.t(statusMessage),
                    solutionApproved: approved,
                    commitmentId: testCommitmentId,
                })
            }

            return res.json({
                status: req.t(statusMessage),
                solutionApproved: false,
            })
        } catch (err) {
            // TODO fix error handling
            return next(new ProsopoApiError(err as Error, undefined, 400))
        }
    })

    return router
}
