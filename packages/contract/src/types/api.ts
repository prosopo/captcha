import { Captcha } from "./captcha"


export type CaptchaResponse = CaptchaWithProof[]

export interface CaptchaWithProof {
    captcha: Captcha
    proof: string[][]
}