import { z } from 'zod'
import { Captcha, CaptchaSolutionSchema } from './captcha'

export interface CaptchaWithProof {
    captcha: Captcha
    proof: string[][]
}

export type CaptchaResponse = CaptchaWithProof[]

export interface CaptchaSolutionResponse {
    captchaId: string
    proof: string[][]
}

export const CaptchaSolutionBody = z.object({
    userAccount: z.string(),
    dappAccount: z.string(),
    captchas: CaptchaSolutionSchema,
    requestHash: z.string()
})

export interface PendingCaptchaRequest {
    accountId: string,
    pending: boolean,
    salt: string
}
