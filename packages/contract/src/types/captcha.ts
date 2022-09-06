// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of provider <https://github.com/prosopo-io/provider>.
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
import { AccountId, Hash } from '@polkadot/types/interfaces'
import { u32, u64 } from '@polkadot/types'
import { Override } from './util';
// import {ProsopoConfigSchema} from "./config";

export enum CaptchaTypes { SelectAll = 'SelectAll'}

export enum CaptchaItemTypes {Text = 'text', Image = 'image'}

export enum CaptchaStates {Solved = 'solved', Unsolved = 'unsolved'}

const CaptchaItemTypesZod = z.nativeEnum(CaptchaItemTypes)

export type RawSolution = number;
export type HashedSolution = string;

export type CaptchaWithoutId = {
    salt: string,
    items: any[],
    target: string,
    solution?: HashedSolution[],
    solved?: boolean
}

export type CaptchaWithoutIdRaw = Override<CaptchaWithoutId, { solution?: RawSolution[] }>

export type CaptchaSolutionToUpdate = {
    captchaId: string,
    salt: string,
    solution: HashedSolution[]
}

export interface Captcha extends CaptchaWithoutId {
    captchaId: string
    assetURI?: string
    datasetId?: string
}

export type CaptchaRaw = Override<Captcha, { solution?: RawSolution[] }>

export type Dataset = {
    datasetId?: Hash | string | Uint8Array,
    captchas: CaptchaWithoutId[] | Captcha[],
    format: CaptchaTypes,
    tree?: string[][]
}

export type DatasetRaw = Override<Dataset, { captchas: CaptchaWithoutIdRaw[] }>

export type DatasetWithIds = {
    datasetId?: Hash | string | Uint8Array,
    captchas: Captcha[],
    format: CaptchaTypes,
    tree?: string[][]
}

export interface DatasetWithIdsAndTree extends DatasetWithIds {
    tree: string[][]
}

export enum CaptchaStatus { Pending = 'Pending', Approved = 'Approved', Disapproved = 'Disapproved' }

export interface CaptchaSolutionCommitment {
    account: AccountId,
    captchaDatasetId: Hash,
    status: CaptchaStatus,
    contract: AccountId,
    provider: AccountId,
    completed_at: u64,
}

export type CaptchaSolutionRaw = Override<CaptchaSolution, { solution: RawSolution[] }>

export type CaptchaSolution = {
    captchaId: string
    salt: string,
    solution: HashedSolution[]
}

export type CaptchaConfig = {
    solved: {
        count: number
    },
    unsolved: {
        count: number
    }
}

export type CaptchaSolutionConfig = {
    requiredNumberOfSolutions: number,
    solutionWinningPercentage: number,
    captchaFilePath: string,
    captchaBlockRecency: number
}

export type LastCorrectCaptcha = {
    before_ms: u32,
    dapp_id: AccountId,
}

export const CaptchaSchema = z.object({
    captchaId: z.union([z.string(), z.undefined()]),
    salt: z.string(),
    solution: z.number().array().optional(),
    timeLimit: z.number().optional()
})

const CaptchaItemSchema = z.object({
    hash: z.string().optional(),
})

export const CaptchaImageSchema = CaptchaItemSchema.extend({
    path: z.string(),
    type: CaptchaItemTypesZod
})
export type CaptchaImage = z.infer<typeof CaptchaImageSchema>

export const CaptchaTextSchema = CaptchaItemSchema.extend({
    text: z.string(),
    type: CaptchaItemTypesZod
})

export const SelectAllCaptchaSchemaRaw = CaptchaSchema.extend({
    items: z.union([z.array(CaptchaImageSchema), z.array(CaptchaTextSchema)]),
    target: z.string()
})

export const SelectAllCaptchaSchema = SelectAllCaptchaSchemaRaw.extend({
    solution: z.string().array().optional(),
})

export const CaptchasSchema = z.array(SelectAllCaptchaSchemaRaw)

export const CaptchaSolution = z.object({
    captchaId: z.string(),
    solution: z.string().array(),
    salt: z.string(),
})

export const CaptchaSolutionSchema = z.array(CaptchaSolution)

export const DatasetSchema = z.object({
    datasetId: z.string().optional(),
    captchas: CaptchasSchema,
    format: z.nativeEnum(CaptchaTypes),
    tree: z.array(z.array(z.string())).optional(),
    timeLimit: z.number().optional()
})

export const DatasetWithIdsSchema = z.object({
    datasetId: z.string(),
    captchas: z.array(SelectAllCaptchaSchema),
    format: z.nativeEnum(CaptchaTypes),
    tree: z.array(z.array(z.string())).optional()
})

export const DatasetWithIdsAndTreeSchema = DatasetWithIdsSchema.extend({
    tree: z.array(z.array(z.string()))
})
