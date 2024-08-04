import { describe, it, expect } from 'vitest'
import fetch from 'node-fetch'
import { ApiPaths, Captcha, CaptchaResponseBody, CaptchaSolutionResponse } from '@prosopo/types'
import { getPairAsync } from '@prosopo/contract'
import { stringToU8a, u8aToHex } from '@polkadot/util'
import { datasetWithSolutionHashes } from '@prosopo/datasets'
import { dummyUserAccount } from './mocks/solvedTestCaptchas.js'

const solutions = datasetWithSolutionHashes

const baseUrl = 'http://localhost:9229'

const getSolvedCaptchas = (captchas: Captcha[], solutions: typeof datasetWithSolutionHashes.captchas) =>
    captchas.map((captcha) => {
        const solvedCaptcha = solutions.find(
            (solvedCaptcha) => solvedCaptcha.captchaContentId === captcha.captchaContentId
        )
        if (!solvedCaptcha || !solvedCaptcha.solution) {
            throw new Error('Solution not found for captcha')
        }

        return {
            captchaContentId: captcha.captchaContentId,
            captchaId: captcha.captchaId,
            salt: solvedCaptcha.salt,
            solution: solvedCaptcha.solution,
        }
    })

describe('Image Captcha Integration Tests', () => {
    describe('GetImageCaptchaChallenge', () => {
        it('should supply an image captcha challenge to a Dapp User', async () => {
            const userAccount = '5EquBjgKx98VFyP9xVYeAUE2soNGBUbru7L9pXgdmSmrDrQp'
            const dappAccount = '5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw'
            const origin = 'http://localhost'

            const response = await fetch(
                `${baseUrl}${ApiPaths.GetImageCaptchaChallenge}/${solutions.datasetId}/${userAccount}/${dappAccount}/0`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        Origin: origin,
                    },
                }
            )

            expect(response.status).toBe(200)
        })
        it('should fail if datasetID is incorrect', async () => {
            const userAccount = '5EquBjgKx98VFyP9xVYeAUE2soNGBUbru7L9pXgdmSmrDrQp'
            const dappAccount = '5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw'

            const response = await fetch(
                `${baseUrl}${ApiPaths.GetImageCaptchaChallenge}/"thewrongdsetId"/${userAccount}/${dappAccount}/0`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            )

            expect(response.status).toBe(400)
        })
    })
    describe('SubmitImageCaptchaSolution', () => {
        it('should verify a correctly completed PoW captcha as true', async () => {
            const pair = await getPairAsync(undefined, dummyUserAccount.seed, undefined, 'sr25519', 42)

            const userAccount = dummyUserAccount.address
            const dappAccount = '5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw'
            const origin = 'http://localhost'

            const response = await fetch(
                `${baseUrl}${ApiPaths.GetImageCaptchaChallenge}/${solutions.datasetId}/${userAccount}/${dappAccount}/0`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        Origin: origin,
                    },
                }
            )

            expect(response.status).toBe(200)

            const data = (await response.json()) as CaptchaResponseBody

            const solvedCaptchas = datasetWithSolutionHashes.captchas.map((captcha) => ({
                captchaContentId: captcha.captchaContentId,
                solution: captcha.solution,
                salt: captcha.salt,
            }))

            const temp = data.captchas.map((captcha) => {
                const solvedCaptcha = solvedCaptchas.find(
                    (solvedCaptcha) => solvedCaptcha.captchaContentId === captcha.captchaContentId
                )
                if (!solvedCaptcha || !solvedCaptcha.solution) {
                    throw new Error('wtf?')
                }

                return {
                    captchaContentId: captcha.captchaContentId,
                    captchaId: captcha.captchaId,
                    salt: solvedCaptcha.salt,
                    solution: solvedCaptcha.solution,
                }
            })

            const body = {
                captchas: temp,
                dapp: dappAccount,
                requestHash: data.requestHash,
                signature: u8aToHex(pair.sign(stringToU8a(data.requestHash))),
                timestampSignature: data.timestampSignature,
                timestamp: data.timestamp,
                user: userAccount,
            }

            const solveThatCaptcha = await fetch(`${baseUrl}${ApiPaths.SubmitImageCaptchaSolution}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Origin: origin,
                },
                body: JSON.stringify(body),
            })

            const res = (await solveThatCaptcha.json()) as CaptchaSolutionResponse
            expect(res.status).toBe('You correctly answered the captchas')
        })
    })
})
