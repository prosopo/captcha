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
import { Connection, Model, Schema } from 'mongoose'

export interface UserCommitmentRecord {
    userAccount: string
    commitmentId: string
    approved: boolean
    datetime: Date
}

export interface SolutionRecord extends CaptchaSolution {
    datasetId: string
    datasetContentId: string
}

export interface Tables {
    captcha: typeof Model
    dataset: typeof Model
    solution: typeof Model
    usersolution: typeof Model
    commitment: typeof Model
    pending: typeof Model
}

export const CaptchaRecordSchema = new Schema<Captcha>({
    captchaId: { type: String, required: true },
    captchaContentId: { type: String, required: true },
    assetURI: { type: String, required: false },
    datasetId: { type: String, required: true },
    datasetContentId: { type: String, required: true },
    solved: { type: Boolean, required: true },
    target: { type: String, required: true },
    salt: { type: String, required: true },
    items: {
        type: [
            new Schema<Item>(
                {
                    hash: { type: String, required: true },
                    data: { type: String, required: true },
                    type: { type: String, required: true },
                },
                { _id: false }
            ),
        ],
        required: true,
    },
})

export const UserCommitmentRecordSchema = new Schema<UserCommitmentRecord>({
    userAccount: { type: String, required: true },
    commitmentId: { type: String, required: true },
    approved: { type: Boolean, required: true },
    datetime: { type: Date, required: true },
})

export const DatasetRecordSchema = new Schema<DatasetBase>({
    contentTree: { type: [[String]], required: true },
    datasetContentId: { type: String, required: true },
    datasetId: { type: String, required: true },
    format: { type: String, required: true },
    solutionTree: { type: [[String]], required: true },
})

export const SolutionRecordSchema = new Schema<SolutionRecord>({
    captchaId: { type: String, required: true },
    captchaContentId: { type: String, required: true },
    datasetId: { type: String, required: true },
    datasetContentId: { type: String, required: true },
    salt: { type: String, required: true },
    solution: { type: [String], required: true },
})

export const UserSolutionSchema = CaptchaSolutionSchema.extend({
    processed: z.boolean(),
    commitmentId: z.string(),
})
export type UserSolutionRecord = z.infer<typeof UserSolutionSchema>
export const UserSolutionRecordSchema = new Schema<UserSolutionRecord>(
    {
        captchaId: { type: String, required: true },
        captchaContentId: { type: String, required: true },
        salt: { type: String, required: true },
        solution: [{ type: String, required: true }],
        processed: { type: Boolean, required: true },
        commitmentId: { type: String, required: true },
    },
    { _id: false }
)

export const PendingRecordSchema = new Schema<PendingCaptchaRequest>({
    accountId: { type: String, required: true },
    pending: { type: Boolean, required: true },
    salt: { type: String, required: true },
    requestHash: { type: String, required: true },
    deadline: { type: Number, required: true }, // unix timestamp
})

export interface Database {
    readonly url: string
    tables?: Tables
    dbname: string
    connection?: Connection
    logger: typeof consola

    connect(): Promise<void>

    storeDataset(dataset: Dataset): Promise<void>

    getDataset(datasetId: string): Promise<DatasetWithIds>

    getRandomCaptcha(solved: boolean, datasetId: Hash | string, size?: number): Promise<Captcha[] | undefined>

    getCaptchaById(captchaId: string[]): Promise<Captcha[] | undefined>

    updateCaptcha(captcha: Captcha, datasetId: string): Promise<void>

    removeCaptchas(captchaIds: string[]): Promise<void>

    getDatasetDetails(datasetId: Hash | string | Uint8Array): Promise<DatasetBase>

    storeDappUserSolution(captchas: CaptchaSolution[], commitmentId: string, userAccount: string): Promise<void>

    storeDappUserPending(userAccount: string, requestHash: string, salt: string, deadline: number): Promise<void>

    getDappUserPending(requestHash: string): Promise<PendingCaptchaRequest>

    updateDappUserPendingStatus(userAccount: string, requestHash: string, approve: boolean): Promise<void>

    getAllCaptchasByDatasetId(datasetId: string, captchaState?: CaptchaStates): Promise<Captcha[] | undefined>

    getAllDappUserSolutions(captchaId: string[]): Promise<UserSolutionRecord[] | undefined>

    getDatasetIdWithSolvedCaptchasOfSizeN(solvedCaptchaCount): Promise<string>

    getRandomSolvedCaptchasFromSingleDataset(datasetId: string, size: number): Promise<CaptchaSolution[]>

    getDappUserSolutionById(commitmentId: string): Promise<UserSolutionRecord | undefined>

    getDappUserCommitmentById(commitmentId: string): Promise<UserCommitmentRecord | undefined>

    getDappUserCommitmentByAccount(accountId: string): Promise<UserCommitmentRecord[]>

    approveDappUserCommitment(commitmentId: string): Promise<void>

    removeDappUserSolutions(captchaIds: string[]): Promise<void>

    flagUsedDappUserSolutions(captchaIds: string[]): Promise<void>
}
