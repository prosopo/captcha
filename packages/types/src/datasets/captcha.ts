// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of provider <https://github.com/prosopo/provider>.
//
// provider is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// provider is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with provider.  If not, see <http://www.gnu.org/licenses/>.
import { z } from 'zod'
import { AccountId } from '@polkadot/types/interfaces'
import { u32 } from '@polkadot/types'

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
