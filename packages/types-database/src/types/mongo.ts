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
import type { Logger } from "@prosopo/common";
import {
  type Captcha,
  type CaptchaSolution,
  CaptchaSolutionSchema,
  type CaptchaStates,
  CaptchaStatus,
  type Commit,
  type Dataset,
  type DatasetBase,
  type DatasetWithIds,
  type Item,
  type PowCaptcha,
  PoWChallengeComponents,
  PoWChallengeId,
} from "@prosopo/types";
import type { Hash } from "@prosopo/types";
import type { PendingCaptchaRequest } from "@prosopo/types";
import {
  ScheduledTaskNames,
  type ScheduledTaskResult,
  ScheduledTaskStatus,
} from "@prosopo/types";
import type { DeleteResult } from "mongodb";
import mongoose, { type Connection, type Model, Schema } from "mongoose";
import {
  type ZodType,
  any,
  array,
  boolean,
  date,
  nativeEnum,
  number,
  object,
  string,
  type infer as zInfer,
} from "zod";

export interface UserCommitmentRecord
  extends Omit<Commit, "userSignaturePart1" | "userSignaturePart2"> {
  userSignature: number[];
  checked: boolean;
  stored?: boolean;
  requestedAtTimestamp: number;
}

export const UserCommitmentSchema = object({
  userAccount: string(),
  dappContract: string(),
  datasetId: string(),
  providerAccount: string(),
  id: string(),
  status: nativeEnum(CaptchaStatus),
  userSignature: array(number()),
  completedAt: number(),
  requestedAt: number(),
  checked: boolean(),
  stored: boolean().optional(),
  requestedAtTimestamp: number(),
}) satisfies ZodType<UserCommitmentRecord>;

export interface SolutionRecord extends CaptchaSolution {
  datasetId: string;
  datasetContentId: string;
}

export interface Tables {
  captcha: typeof Model<Captcha>;
  powCaptcha: typeof Model<PowCaptcha>;
  dataset: typeof Model<DatasetWithIds>;
  solution: typeof Model<SolutionRecord>;
  usersolution: typeof Model<UserSolutionRecord>;
  commitment: typeof Model<UserCommitmentRecord>;
  pending: typeof Model<PendingCaptchaRequest>;
  scheduler: typeof Model<ScheduledTaskRecord>;
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
        { _id: false },
      ),
    ],
    required: true,
  },
});
// Set an index on the captchaId field, ascending
CaptchaRecordSchema.index({ captchaId: 1 });

export type PowCaptchaRecord = mongoose.Document & PowCaptcha;

export const PowCaptchaRecordSchema = new Schema<PowCaptchaRecord>({
  challenge: { type: String, required: true },
  dappAccount: { type: String, required: true },
  userAccount: { type: String, required: true },
  timestamp: { type: Number, required: true },
  checked: { type: Boolean, required: true },
  stored: { type: Boolean, required: true },
});

// Set an index on the captchaId field, ascending
PowCaptchaRecordSchema.index({ captchaId: 1 });

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
  checked: { type: Boolean, required: true },
  stored: { type: Boolean, required: false },
  requestedAtTimestamp: { type: Number, required: true },
});
// Set an index on the commitment id field, descending
UserCommitmentRecordSchema.index({ id: -1 });

export const DatasetRecordSchema = new Schema<DatasetWithIds>({
  contentTree: { type: [[String]], required: true },
  datasetContentId: { type: String, required: true },
  datasetId: { type: String, required: true },
  format: { type: String, required: true },
  solutionTree: { type: [[String]], required: true },
});
// Set an index on the datasetId field, ascending
DatasetRecordSchema.index({ datasetId: 1 });

export const SolutionRecordSchema = new Schema<SolutionRecord>({
  captchaId: { type: String, required: true },
  captchaContentId: { type: String, required: true },
  datasetId: { type: String, required: true },
  datasetContentId: { type: String, required: true },
  salt: { type: String, required: true },
  solution: { type: [String], required: true },
});
// Set an index on the captchaId field, ascending
SolutionRecordSchema.index({ captchaId: 1 });

export const UserSolutionSchema = CaptchaSolutionSchema.extend({
  processed: boolean(),
  checked: boolean(),
  commitmentId: string(),
});
export type UserSolutionRecord = zInfer<typeof UserSolutionSchema>;
export const UserSolutionRecordSchema = new Schema<UserSolutionRecord>(
  {
    captchaId: { type: String, required: true },
    captchaContentId: { type: String, required: true },
    salt: { type: String, required: true },
    solution: [{ type: String, required: true }],
    processed: { type: Boolean, required: true },
    checked: { type: Boolean, required: true },
    commitmentId: { type: String, required: true },
  },
  { _id: false },
);
// Set an index on the captchaId field, ascending
UserSolutionRecordSchema.index({ captchaId: 1 });

export const UserCommitmentWithSolutionsSchema = UserCommitmentSchema.extend({
  captchas: array(UserSolutionSchema),
});

export type UserCommitmentWithSolutions = zInfer<
  typeof UserCommitmentWithSolutionsSchema
>;

export const PendingRecordSchema = new Schema<PendingCaptchaRequest>({
  accountId: { type: String, required: true },
  pending: { type: Boolean, required: true },
  salt: { type: String, required: true },
  requestHash: { type: String, required: true },
  deadlineTimestamp: { type: Number, required: true }, // unix timestamp
  requestedAtBlock: { type: Number, required: true },
});
// Set an index on the requestHash field, descending
PendingRecordSchema.index({ requestHash: -1 });

export const ScheduledTaskSchema = object({
  taskId: string(),
  processName: nativeEnum(ScheduledTaskNames),
  datetime: date(),
  status: nativeEnum(ScheduledTaskStatus),
  result: object({
    data: any().optional(),
    error: any().optional(),
  }).optional(),
});

export type ScheduledTaskRecord = zInfer<typeof ScheduledTaskSchema>;

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
      { _id: false },
    ),

    required: false,
  },
});

export interface Database {
  url: string;
  tables?: Tables;
  dbname: string;
  connection?: Connection;
  logger: Logger;

  getTables(): Tables;

  getConnection(): Connection;

  connect(): Promise<void>;

  close(): Promise<void>;

  storeDataset(dataset: Dataset): Promise<void>;

  getSolutions(datasetId: string): Promise<SolutionRecord[]>;

  getDataset(datasetId: string): Promise<DatasetWithIds>;

  getRandomCaptcha(
    solved: boolean,
    datasetId: Hash | string,
    size?: number,
  ): Promise<Captcha[] | undefined>;

  getCaptchaById(captchaId: string[]): Promise<Captcha[] | undefined>;

  updateCaptcha(captcha: Captcha, datasetId: string): Promise<void>;

  removeCaptchas(captchaIds: string[]): Promise<void>;

  getDatasetDetails(
    datasetId: Hash | string | Uint8Array,
  ): Promise<DatasetBase>;

  storeDappUserSolution(
    captchas: CaptchaSolution[],
    commit: UserCommitmentRecord,
  ): Promise<void>;

  storeDappUserPending(
    userAccount: string,
    requestHash: string,
    salt: string,
    deadlineTimestamp: number,
    requestedAtBlock: number,
  ): Promise<void>;

  getDappUserPending(requestHash: string): Promise<PendingCaptchaRequest>;

  updateDappUserPendingStatus(requestHash: string): Promise<void>;

  getAllCaptchasByDatasetId(
    datasetId: string,
    captchaState?: CaptchaStates,
  ): Promise<Captcha[] | undefined>;

  getAllDappUserSolutions(
    captchaId: string[],
  ): Promise<UserSolutionRecord[] | undefined>;

  getDatasetIdWithSolvedCaptchasOfSizeN(
    solvedCaptchaCount: number,
  ): Promise<string>;

  getRandomSolvedCaptchasFromSingleDataset(
    datasetId: string,
    size: number,
  ): Promise<CaptchaSolution[]>;

  getDappUserSolutionById(
    commitmentId: string,
  ): Promise<UserSolutionRecord | undefined>;

  getDappUserCommitmentById(
    commitmentId: string,
  ): Promise<UserCommitmentRecord | undefined>;

  getDappUserCommitmentByAccount(
    accountId: string,
  ): Promise<UserCommitmentRecord[]>;

  approveDappUserCommitment(commitmentId: string): Promise<void>;

  removeProcessedDappUserSolutions(
    commitmentIds: Hash[],
  ): Promise<DeleteResult | undefined>;

  removeProcessedDappUserCommitments(
    commitmentIds: Hash[],
  ): Promise<DeleteResult | undefined>;

  getProcessedDappUserSolutions(): Promise<UserSolutionRecord[]>;

  getProcessedDappUserCommitments(): Promise<UserCommitmentRecord[]>;

  getCheckedDappUserCommitments(): Promise<UserCommitmentRecord[]>;

  getUnstoredDappUserCommitments(): Promise<UserCommitmentRecord[]>;

  markDappUserCommitmentsStored(commitmentIds: Hash[]): Promise<void>;

  markDappUserCommitmentsChecked(commitmentIds: Hash[]): Promise<void>;

  getUnstoredDappUserPoWCommitments(): Promise<PowCaptcha[]>;

  markDappUserPoWCommitmentsStored(challengeIds: string[]): Promise<void>;

  flagProcessedDappUserSolutions(captchaIds: Hash[]): Promise<void>;

  flagProcessedDappUserCommitments(commitmentIds: Hash[]): Promise<void>;

  getLastScheduledTaskStatus(
    task: ScheduledTaskNames,
    status?: ScheduledTaskStatus,
  ): Promise<ScheduledTaskRecord | undefined>;

  getScheduledTaskStatus(
    taskId: string,
    status: ScheduledTaskStatus,
  ): Promise<ScheduledTaskRecord | undefined>;

  storeScheduledTaskStatus(
    taskId: `0x${string}`,
    task: ScheduledTaskNames,
    status: ScheduledTaskStatus,
    result?: ScheduledTaskResult,
  ): Promise<void>;

  storePowCaptchaRecord(
    challenge: PoWChallengeId,
    components: PoWChallengeComponents,
    checked: boolean,
  ): Promise<void>;

  getPowCaptchaRecordByChallenge(challenge: string): Promise<PowCaptcha | null>;

  updatePowCaptchaRecord(challenge: string, checked: boolean): Promise<void>;
}
