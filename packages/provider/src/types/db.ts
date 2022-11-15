// Copyright 2021-2022 Prosopo (UK) Ltd.
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
import { Hash } from '@polkadot/types/interfaces'
import {
    Captcha,
    CaptchaSolution,
    CaptchaSolutionSchema,
    CaptchaStates,
    Dataset,
    DatasetBase,
    DatasetWithIds,
    Item,
} from '@prosopo/datasets'
import { PendingCaptchaRequest } from './api'
import consola from 'consola'
import { z } from 'zod'
import { Model, Schema } from 'mongoose'

export interface UserSolution {
    userAccount: string
    captchas: CaptchaSolution[]
    commitmentId: string
    approved: boolean
    datetime: Date
}

export interface Tables {
    [key: string]: typeof Model
}

export const CaptchaRecordSchema = new Schema<Captcha>({
    captchaId: { type: String, required: true },
    captchaContentId: { type: String, required: true },
    assetURI: { type: String, required: false },
    datasetId: { type: String, required: false },
    datasetContentId: { type: String, required: false },
    solved: { type: Boolean, required: true },
    items: {
        type: [
            new Schema<Item>(
                {
                    hash: String,
                    data: String,
                    type: String,
                },
                { _id: false }
            ),
        ],
        required: true,
    },
})

export const DatasetRecordSchema = new Schema<DatasetBase>({
    contentTree: { type: [[String]], required: true },
    datasetContentId: { type: String, required: true },
    datasetId: { type: String, required: true },
    format: { type: String, required: true },
    solutionTree: { type: [[String]], required: true },
})

export const SolutionRecordSchema = new Schema<CaptchaSolution>({
    captchaId: { type: String, required: true },
    captchaContentId: { type: String, required: true },
    salt: { type: String, required: true },
    solution: { type: [String], required: true },
})

export const UserSolutionRecordSchema = new Schema<UserSolution>({
    userAccount: { type: String, required: true },
    captchas: {
        type: [
            new Schema<CaptchaSolution>({
                captchaId: String,
                captchaContentId: String,
                salt: String,
                solution: [String],
            }),
        ],
        required: true,
    },
    commitmentId: { type: String, required: true },
    approved: { type: Boolean, required: true },
    datetime: { type: Date, required: true },
})

export const PendingRecordSchema = new Schema<PendingCaptchaRequest>({
    accountId: { type: String, required: true },
    pending: { type: Boolean, required: true },
    salt: { type: String, required: true },
})

export const DappUserSolutionSchema = z.object({
    userAccount: z.string(),
    captchas: z.array(CaptchaSolutionSchema),
    commitmentId: z.string(),
    approved: z.boolean(),
    datetime: z.string(),
})

export type DappUserSolution = z.infer<typeof DappUserSolutionSchema>

export interface Database {
    readonly url: string
    tables: Tables
    dbname: string
    logger: typeof consola

    connect(): Promise<void>

    storeDataset(dataset: Dataset): Promise<void>

    getDataset(datasetId: string): Promise<DatasetWithIds>

    getRandomCaptcha(solved: boolean, datasetId: Hash | string, size?: number): Promise<Captcha[] | undefined>

    getCaptchaById(captchaId: string[]): Promise<Captcha[] | undefined>

    updateCaptcha(captcha: Captcha, datasetId: string): Promise<void>

    getDatasetDetails(datasetId: Hash | string | Uint8Array): Promise<DatasetBase>

    storeDappUserSolution(captchas: CaptchaSolution[], commitmentId: string, userAccount: string): Promise<void>

    storeDappUserPending(userAccount: string, requestHash: string, salt: string): Promise<void>

    getDappUserPending(requestHash: string): Promise<PendingCaptchaRequest>

    updateDappUserPendingStatus(userAccount: string, requestHash: string, approve: boolean): Promise<void>

    getAllCaptchasByDatasetId(datasetId: string, captchaState?: CaptchaStates): Promise<Captcha[] | undefined>

    getAllDappUserSolutions(captchaId: string[]): Promise<DappUserSolution[] | undefined>

    getDatasetIdWithSolvedCaptchasOfSizeN(solvedCaptchaCount): Promise<string>

    getRandomSolvedCaptchasFromSingleDataset(datasetId: string, size: number): Promise<CaptchaSolution[]>

    getDappUserSolutionById(commitmentId: string): Promise<DappUserSolution | undefined>

    getDappUserSolutionByAccount(accountId: string): Promise<DappUserSolution[]>

    approveDappUserSolution(commitmentId: string): Promise<void>
}
