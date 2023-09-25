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
import {
    Captcha,
    CaptchaSolution,
    CaptchaSolutionSchema,
    CaptchaStates,
    Dataset,
    DatasetBase,
    DatasetWithIds,
    Item,
} from '@prosopo/types'
import { CaptchaStatus, Commit } from '@prosopo/captcha-contract'
import { Connection, Model, Schema } from 'mongoose'
import { DeleteResult } from 'mongodb'
import { Hash } from '@prosopo/types'
import { Logger } from '@prosopo/common'
import { PendingCaptchaRequest } from '@prosopo/types'
import { ScheduledTaskNames, ScheduledTaskResult, ScheduledTaskStatus } from '@prosopo/types'
import { z } from 'zod'

export interface UserCommitmentRecord extends Omit<Commit, 'userSignaturePart1' | 'userSignaturePart2'> {
    userSignature: number[]
    processed: boolean
    batched: boolean
}

export const UserCommitmentSchema = z.object({
    userAccount: z.string(),
    dappContract: z.string(),
    datasetId: z.string(),
    providerAccount: z.string(),
    id: z.string(),
    status: z.nativeEnum(CaptchaStatus),
    userSignature: z.array(z.number()),
    completedAt: z.number(),
    requestedAt: z.number(),
    processed: z.boolean(),
    batched: z.boolean(),
}) satisfies z.ZodType<UserCommitmentRecord>

export interface SolutionRecord extends CaptchaSolution {
    datasetId: string
    datasetContentId: string
}

export interface Tables {
    captcha: typeof Model<Captcha>
    dataset: typeof Model<DatasetWithIds>
    solution: typeof Model<SolutionRecord>
    usersolution: typeof Model<UserSolutionRecord>
    commitment: typeof Model<UserCommitmentRecord>
    pending: typeof Model<PendingCaptchaRequest>
    scheduler: typeof Model<ScheduledTaskRecord>
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
// Set an index on the captchaId field, ascending
CaptchaRecordSchema.index({ captchaId: 1 })

export const UserCommitmentRecordSchema = new Schema<UserCommitmentRecord>({
    userAccount: { type: String, required: true },
    dappContract: { type: String, required: true },
    providerAccount: { type: String, required: true },
    datasetId: { type: String, required: true },
    id: { type: String, required: true },
    status: { type: String, required: true },
    requestedAt: { type: Number, required: true },
    completedAt: { type: Number, required: true },
    userSignature: { type: [Number], required: true },
    processed: { type: Boolean, required: true },
    batched: { type: Boolean, required: true },
})
// Set an index on the commitment id field, descending
UserCommitmentRecordSchema.index({ id: -1 })

export const DatasetRecordSchema = new Schema<DatasetWithIds>({
    contentTree: { type: [[String]], required: true },
    datasetContentId: { type: String, required: true },
    datasetId: { type: String, required: true },
    format: { type: String, required: true },
    solutionTree: { type: [[String]], required: true },
})
// Set an index on the datasetId field, ascending
DatasetRecordSchema.index({ datasetId: 1 })

export const SolutionRecordSchema = new Schema<SolutionRecord>({
    captchaId: { type: String, required: true },
    captchaContentId: { type: String, required: true },
    datasetId: { type: String, required: true },
    datasetContentId: { type: String, required: true },
    salt: { type: String, required: true },
    solution: { type: [String], required: true },
})
// Set an index on the captchaId field, ascending
SolutionRecordSchema.index({ captchaId: 1 })

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
// Set an index on the captchaId field, ascending
UserSolutionRecordSchema.index({ captchaId: 1 })

export const UserCommitmentWithSolutionsSchema = UserCommitmentSchema.extend({
    captchas: z.array(UserSolutionSchema),
})

export type UserCommitmentWithSolutions = z.infer<typeof UserCommitmentWithSolutionsSchema>

export const PendingRecordSchema = new Schema<PendingCaptchaRequest>({
    accountId: { type: String, required: true },
    pending: { type: Boolean, required: true },
    salt: { type: String, required: true },
    requestHash: { type: String, required: true },
    deadlineTimestamp: { type: Number, required: true }, // unix timestamp
    requestedAtBlock: { type: Number, required: true },
})
// Set an index on the requestHash field, descending
PendingRecordSchema.index({ requestHash: -1 })

export const ScheduledTaskSchema = z.object({
    taskId: z.string(),
    processName: z.nativeEnum(ScheduledTaskNames),
    datetime: z.date(),
    status: z.nativeEnum(ScheduledTaskStatus),
    result: z
        .object({
            data: z.any().optional(),
            error: z.any().optional(),
        })
        .optional(),
})

export type ScheduledTaskRecord = z.infer<typeof ScheduledTaskSchema>

export const ScheduledTaskRecordSchema = new Schema<ScheduledTaskRecord>({
    taskId: { type: String, required: true },
    processName: { type: String, enum: ScheduledTaskNames, required: true },
    datetime: { type: Date, required: true },
    status: { type: String, enum: ScheduledTaskStatus, require: true },
    result: {
        type: new Schema<ScheduledTaskResult>(
            {
                error: { type: String, required: false },
                data: { type: Object, required: false },
            },
            { _id: false }
        ),

        required: false,
    },
})

export interface Database {
    url: string
    tables?: Tables
    dbname: string
    connection?: Connection
    logger: Logger

    connect(): Promise<void>

    close(): Promise<void>

    storeDataset(dataset: Dataset): Promise<void>

    getDataset(datasetId: string): Promise<DatasetWithIds>

    getRandomCaptcha(solved: boolean, datasetId: Hash | string, size?: number): Promise<Captcha[] | undefined>

    getCaptchaById(captchaId: string[]): Promise<Captcha[] | undefined>

    updateCaptcha(captcha: Captcha, datasetId: string): Promise<void>

    removeCaptchas(captchaIds: string[]): Promise<void>

    getDatasetDetails(datasetId: Hash | string | Uint8Array): Promise<DatasetBase>

    storeDappUserSolution(captchas: CaptchaSolution[], commit: UserCommitmentRecord): Promise<void>

    storeDappUserPending(
        userAccount: string,
        requestHash: string,
        salt: string,
        deadlineTimestamp: number,
        requestedAtBlock: number
    ): Promise<void>

    getDappUserPending(requestHash: string): Promise<PendingCaptchaRequest>

    updateDappUserPendingStatus(userAccount: string, requestHash: string, approve: boolean): Promise<void>

    getAllCaptchasByDatasetId(datasetId: string, captchaState?: CaptchaStates): Promise<Captcha[] | undefined>

    getAllDappUserSolutions(captchaId: string[]): Promise<UserSolutionRecord[] | undefined>

    getDatasetIdWithSolvedCaptchasOfSizeN(solvedCaptchaCount: number): Promise<string>

    getRandomSolvedCaptchasFromSingleDataset(datasetId: string, size: number): Promise<CaptchaSolution[]>

    getDappUserSolutionById(commitmentId: string): Promise<UserSolutionRecord | undefined>

    getDappUserCommitmentById(commitmentId: string): Promise<UserCommitmentRecord | undefined>

    getDappUserCommitmentByAccount(accountId: string): Promise<UserCommitmentRecord[]>

    approveDappUserCommitment(commitmentId: string): Promise<void>

    removeProcessedDappUserSolutions(commitmentIds: Hash[]): Promise<DeleteResult | undefined>

    removeProcessedDappUserCommitments(commitmentIds: Hash[]): Promise<DeleteResult | undefined>

    getProcessedDappUserSolutions(): Promise<UserSolutionRecord[]>

    getProcessedDappUserCommitments(): Promise<UserCommitmentRecord[]>

    getUnbatchedDappUserCommitments(): Promise<UserCommitmentRecord[]>

    getBatchedDappUserCommitments(): Promise<UserCommitmentRecord[]>

    flagProcessedDappUserSolutions(captchaIds: Hash[]): Promise<void>

    flagProcessedDappUserCommitments(commitmentIds: Hash[]): Promise<void>

    flagBatchedDappUserCommitments(commitmentIds: Hash[]): Promise<void>

    getLastBatchCommitTime(): Promise<Date>

    getLastScheduledTaskStatus(
        task: ScheduledTaskNames,
        status?: ScheduledTaskStatus
    ): Promise<ScheduledTaskRecord | undefined>

    getScheduledTaskStatus(taskId: string, status: ScheduledTaskStatus): Promise<ScheduledTaskRecord | undefined>

    storeScheduledTaskStatus(
        taskId: `0x${string}`,
        task: ScheduledTaskNames,
        status: ScheduledTaskStatus,
        result?: ScheduledTaskResult
    ): Promise<void>
}
