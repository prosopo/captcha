// Copyright 2021-2024 Prosopo (UK) Ltd.
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
import {
    Captcha,
    CaptchaTypes,
    CaptchaWithoutId,
    CaptchasSchema,
    CaptchasWithNumericSolutionSchema,
    SelectAllCaptchaSchema,
} from './captcha.js'
import { Hash } from '@prosopo/types'
import { array, nativeEnum, number, object, string } from 'zod'

export type DatasetBase = {
    datasetId?: Hash
    datasetContentId?: Hash
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
    datasetId: Hash
    datasetContentId: Hash
    captchas: Captcha[]
    format: CaptchaTypes
    contentTree?: string[][]
    solutionTree?: string[][]
}

export interface DatasetWithIdsAndTree extends DatasetWithIds {
    contentTree: string[][]
}

// Zod schemas

export const DatasetSchema = object({
    datasetId: string().optional(),
    datasetContentId: string().optional(),
    captchas: CaptchasSchema,
    format: nativeEnum(CaptchaTypes),
    solutionTree: array(array(string())).optional(),
    contentTree: array(array(string())).optional(),
    timeLimit: number().optional(),
})

export const DatasetWithNumericSolutionSchema = DatasetSchema.extend({
    captchas: CaptchasWithNumericSolutionSchema,
})

export const DatasetWithIdsSchema = object({
    datasetId: string(),
    datasetContentId: string().optional(),
    captchas: array(SelectAllCaptchaSchema),
    format: nativeEnum(CaptchaTypes),
    solutionTree: array(array(string())).optional(),
    contentTree: array(array(string())).optional(),
})

export const DatasetWithIdsAndTreeSchema = DatasetWithIdsSchema.extend({
    solutionTree: array(array(string())),
    contentTree: array(array(string())),
})
