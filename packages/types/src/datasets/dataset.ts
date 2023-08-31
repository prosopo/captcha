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
import { ArgumentTypes } from '../contract/typechain/captcha/types-arguments/index.js'
import { Captcha, CaptchaTypes, CaptchaWithoutId, CaptchasSchema, SelectAllCaptchaSchema } from './captcha.js'
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
