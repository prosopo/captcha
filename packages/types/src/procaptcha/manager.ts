import { ApiParams } from '../provider'
import { z } from 'zod'

export const ProcaptchaOutputSchema = z.object({
    [ApiParams.commitmentId]: z.string().optional(),
    [ApiParams.providerUrl]: z.string().optional(),
    [ApiParams.dapp]: z.string(),
    [ApiParams.user]: z.string(),
    [ApiParams.blockNumber]: z.number().optional(),
})

/**
 * The information produced by procaptcha on completion of the captcha process,
 * whether verified by smart contract, a pending commitment in the cache of a
 * provider or a captcha challenge.
 */
export type ProcaptchaOutput = z.infer<typeof ProcaptchaOutputSchema>

export const ProcaptchaResponse = z.object({
    [ApiParams.procaptchaResponse]: ProcaptchaOutputSchema,
})
