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
import { AccountId } from '@polkadot/types/interfaces'
import { u32 } from '@polkadot/types'
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
export interface HashedItem extends Omit<Item, 'hash'> {
    hash: string
}

export interface LabelledItem extends Item {
    label: string,
}

export interface Captchas {
    captchas: CaptchaWithoutId[],
    format: CaptchaTypes,
}

type CaptchaWithoutIdBase = {
    salt: string
    items: Item[]
    target: string
    solved?: boolean
    timeLimitMs?: number
}

export interface CaptchaWithoutId extends CaptchaWithoutIdBase {
    solution?: HashedSolution[] | RawSolution[]
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
    captchaFilePath: string
    captchaBlockRecency: number
}

export type LastCorrectCaptchaSchema = {
    beforeMs: u32
    dappId: AccountId
}

export const CaptchaSchema = z.object({
    captchaId: z.union([z.string(), z.undefined()]),
    captchaContentId: z.union([z.string(), z.undefined()]),
    salt: z.string(),
    solution: z.number().array().optional(),
    timeLimit: z.number().optional(),
})

export const CaptchaItemSchema = z.object({
    hash: z.string().optional(),
    data: z.string(),
    type: z.nativeEnum(CaptchaItemTypes),
})

export const SelectAllCaptchaSchemaRaw = CaptchaSchema.extend({
    items: z.array(CaptchaItemSchema),
    target: z.string(),
})

export const SelectAllCaptchaSchema = SelectAllCaptchaSchemaRaw.extend({
    solution: z.string().array().optional(),
})

export const CaptchasSchema = z.array(SelectAllCaptchaSchemaRaw)

export const CaptchaSolutionSchema = z.object({
    captchaId: z.string(),
    captchaContentId: z.string(),
    solution: z.string().array(),
    salt: z.string(),
})

export const CaptchaSolutionArraySchema = z.array(CaptchaSolutionSchema)
