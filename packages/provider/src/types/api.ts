import {Captcha} from "./captcha"
import {z} from "zod";
import {CaptchaSolutionSchema} from "./captcha";

export type CaptchaResponse = CaptchaWithProof[]

export interface CaptchaWithProof {
    captcha: Captcha
    proof: string[][]
}

export interface CaptchaSolutionResponse {
    captchaId: string
    proof: string[][]
}

export const CaptchaSolutionBody = z.object({
    userAccount: z.string(),
    dappAccount: z.string(),
    captchas: CaptchaSolutionSchema,
    requestHash: z.string(),
})