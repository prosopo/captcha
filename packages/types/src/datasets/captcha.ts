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
import { AccountId } from '@polkadot/types/interfaces/runtime'
import { u32 } from '@polkadot/types-codec/primitive'
import { z } from 'zod'

export enum CaptchaTypes {
    SelectAll = 'SelectAll',
}
export enum CaptchaItemTypes {
    Text = 'text',
    Image = 'image',
}
export enum CaptchaStates {
    Solved = 'solved',
    Unsolved = 'unsolved',
}
export type RawSolution = number
export type HashedSolution = string
export type Item = z.infer<typeof CaptchaItemSchema>
export type HashedItem = z.infer<typeof HashedCaptchaItemSchema>
export type LabelledItem = z.infer<typeof LabelledItemSchema>
export type Data = z.infer<typeof DataSchema>
export type LabelledData = z.infer<typeof LabelledDataSchema>
export type CaptchasContainer = z.infer<typeof CaptchasContainerSchema>
export type LabelsContainer = z.infer<typeof LabelsContainerSchema>

export interface Captchas {
    captchas: CaptchaWithoutId[]
    format: CaptchaTypes
}

type CaptchaWithoutIdBase = {
    salt: string
    items: HashedItem[]
    target: string
    solved?: boolean
    timeLimitMs?: number
}

export interface CaptchaWithoutId extends CaptchaWithoutIdBase {
    solution?: HashedSolution[] | RawSolution[] // this contains the CORRECT items only!
    unlabelled?: HashedSolution[] | RawSolution[] // this contains the unlabelled items only!
    // INCORRECT items are any missing from the solution and unlabelled arrays!
}

export type CaptchaSolutionToUpdate = {
    captchaId: string
    captchaContentId: string
    salt: string
    solution: HashedSolution[]
}

export interface Captcha extends CaptchaWithoutId {
    captchaId: string
    captchaContentId: string
    assetURI?: string
    datasetId?: string
    datasetContentId?: string
}

export interface CaptchaSolution {
    captchaId: string
    captchaContentId: string
    salt: string
    solution: HashedSolution[]
}

export interface CaptchaWithProof {
    captcha: Captcha
    proof: string[][]
}

export type CaptchaConfig = {
    solved: {
        count: number
    }
    unsolved: {
        count: number
    }
}

export type CaptchaSolutionConfig = {
    requiredNumberOfSolutions: number
    solutionWinningPercentage: number
    captchaBlockRecency: number
}

export type LastCorrectCaptchaSchema = {
    beforeMs: u32
    dappId: AccountId
}

export const CaptchaSchema = z.object({
    captchaId: z.union([z.string(), z.undefined()]),
    captchaContentId: z.union([z.string(), z.undefined()]),
    salt: z.string().min(34),
    solution: z.number().array().optional(),
    unlabelled: z.number().array().optional(),
    timeLimit: z.number().optional(),
})

export const CaptchaItemSchema = z.object({
    hash: z.string(),
    data: z.string(),
    type: z.nativeEnum(CaptchaItemTypes),
})

export const HashedCaptchaItemSchema = CaptchaItemSchema.extend({
    hash: z.string(),
})
export const LabelledItemSchema = HashedCaptchaItemSchema.extend({
    label: z.string(),
})

export const MaybeLabelledHashedItemSchema = HashedCaptchaItemSchema.extend({
    label: z.string().optional(),
})

export const SelectAllCaptchaSchemaRaw = CaptchaSchema.extend({
    items: z.array(CaptchaItemSchema),
    target: z.string(),
})

export const SelectAllCaptchaSchema = SelectAllCaptchaSchemaRaw.extend({
    solution: z.string().array().optional(),
    unlabelled: z.string().array().optional(),
})

export const SelectAllCaptchaSchemaWithNumericSolution = SelectAllCaptchaSchema.extend({
    solution: z.number().array().optional(),
    unlabelled: z.number().array().optional(),
})

export const CaptchasSchema = z.array(SelectAllCaptchaSchemaRaw)
export const CaptchasWithNumericSolutionSchema = z.array(SelectAllCaptchaSchemaWithNumericSolution)

export const CaptchaSolutionSchema = z.object({
    captchaId: z.string(),
    captchaContentId: z.string(),
    solution: z.string().array(),
    salt: z.string().min(34),
})

export const CaptchaSolutionArraySchema = z.array(CaptchaSolutionSchema)

export const DataSchema = z.object({
    items: z.array(MaybeLabelledHashedItemSchema),
})

export const LabelledDataSchema = z.object({
    items: z.array(LabelledItemSchema),
})

export const CaptchasContainerSchema = z.object({
    captchas: CaptchasSchema,
    format: z.nativeEnum(CaptchaTypes),
})

export const LabelsContainerSchema = z.object({
    labels: z.array(z.string()),
})
