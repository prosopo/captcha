import { ArgumentTypes } from '../contract/typechain/captcha/types-arguments'
import { Captcha, CaptchaTypes, CaptchaWithoutId, CaptchasSchema, SelectAllCaptchaSchema } from './captcha'
import { z } from 'zod'

export type DatasetBase = {
    datasetId?: ArgumentTypes.Hash
    datasetContentId?: ArgumentTypes.Hash
    format: CaptchaTypes
    contentTree?: string[][]
    solutionTree?: string[][]
}

export interface Dataset extends DatasetBase {
    captchas: CaptchaWithoutId[] | Captcha[]
}

export interface DatasetRaw extends DatasetBase {
    captchas: CaptchaWithoutId[]
}

export type DatasetWithIds = {
    datasetId: ArgumentTypes.Hash
    datasetContentId: ArgumentTypes.Hash
    captchas: Captcha[]
    format: CaptchaTypes
    contentTree?: string[][]
    solutionTree?: string[][]
}

export interface DatasetWithIdsAndTree extends DatasetWithIds {
    contentTree: string[][]
}

// Zod schemas

export const DatasetSchema = z.object({
    datasetId: z.string().optional(),
    datasetContentId: z.string().optional(),
    captchas: CaptchasSchema,
    format: z.nativeEnum(CaptchaTypes),
    solutionTree: z.array(z.array(z.string())).optional(),
    contentTree: z.array(z.array(z.string())).optional(),
    timeLimit: z.number().optional(),
})

export const DatasetWithIdsSchema = z.object({
    datasetId: z.string(),
    datasetContentId: z.string().optional(),
    captchas: z.array(SelectAllCaptchaSchema),
    format: z.nativeEnum(CaptchaTypes),
    solutionTree: z.array(z.array(z.string())).optional(),
    contentTree: z.array(z.array(z.string())).optional(),
})

export const DatasetWithIdsAndTreeSchema = DatasetWithIdsSchema.extend({
    solutionTree: z.array(z.array(z.string())),
    contentTree: z.array(z.array(z.string())),
})
