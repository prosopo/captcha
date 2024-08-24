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
import { Logger, TranslationKey } from "@prosopo/common";
import {
  type Captcha,
  CaptchaResult,
  type CaptchaSolution,
  CaptchaSolutionSchema,
  type CaptchaStates,
  CaptchaStatus,
  type Commit,
  type Dataset,
  type DatasetBase,
  type DatasetWithIds,
  type Item,
  type PoWCaptcha,
  PoWCaptchaUser,
  PoWChallengeComponents,
  PoWChallengeId,
  RequestHashSignature,
  Timestamp,
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
  literal,
  union,
} from "zod";

export enum StoredStatusNames {
  notStored = "notStored",
  userSubmitted = "userSubmitted",
  serverChecked = "serverChecked",
  stored = "stored",
}

export type StoredStatus =
  | StoredStatusNames.notStored
  | StoredStatusNames.userSubmitted
  | StoredStatusNames.serverChecked
  | StoredStatusNames.stored;

export interface StoredCaptcha {
  result: {
    status: CaptchaStatus;
    reason?: string;
    error?: string;
  };
  requestedAtTimestamp: Timestamp;
  deadlineTimestamp?: Timestamp;
  ipAddress: string;
  userSubmitted: boolean;
  serverChecked: boolean;
  storedStatus: StoredStatus;
}

export interface UserCommitmentRecord extends Commit, StoredCaptcha {
  userSignature: string;
}

export interface PoWCaptchaStored extends PoWCaptchaUser, StoredCaptcha {}

export const UserCommitmentSchema = object({
  userAccount: string(),
  dappAccount: string(),
  datasetId: string(),
  providerAccount: string(),
  id: string(),
  result: object({
    status: nativeEnum(CaptchaStatus),
    reason: string().optional(),
    error: string().optional(),
  }),
  userSignature: string(),
  ipAddress: string(),
  userSubmitted: boolean(),
  serverChecked: boolean(),
  storedStatus: union([
    literal(StoredStatusNames.notStored),
    literal(StoredStatusNames.userSubmitted),
    literal(StoredStatusNames.serverChecked),
    literal(StoredStatusNames.stored),
  ]),
  requestedAtTimestamp: number(),
}) satisfies ZodType<UserCommitmentRecord>;

export interface SolutionRecord extends CaptchaSolution {
  datasetId: string;
  datasetContentId: string;
}

export interface Tables {
  captcha: typeof Model<Captcha>;
  powCaptcha: typeof Model<PoWCaptchaStored>;
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

export type PowCaptchaRecord = mongoose.Document & PoWCaptchaStored;

export const PowCaptchaRecordSchema = new Schema<PowCaptchaRecord>({
  challenge: { type: String, required: true },
  dappAccount: { type: String, required: true },
  userAccount: { type: String, required: true },
  requestedAtTimestamp: { type: Number, required: true },
  result: {
    status: { type: String, enum: CaptchaStatus, required: true },
    reason: { type: String, required: false },
    error: { type: String, required: false },
  },
  difficulty: { type: Number, required: true },
  ipAddress: { type: String, required: true },
  userSignature: { type: String, required: false },
  userSubmitted: { type: Boolean, required: true },
  serverChecked: { type: Boolean, required: true },
  storedStatus: { type: String, enum: StoredStatusNames, required: true },
});

// Set an index on the captchaId field, ascending
PowCaptchaRecordSchema.index({ captchaId: 1 });

export const UserCommitmentRecordSchema = new Schema<UserCommitmentRecord>({
  userAccount: { type: String, required: true },
  dappAccount: { type: String, required: true },
  providerAccount: { type: String, required: true },
  datasetId: { type: String, required: true },
  id: { type: String, required: true },
  result: {
    status: { type: String, enum: CaptchaStatus, required: true },
    reason: { type: String, required: false },
    error: { type: String, required: false },
  },
  ipAddress: { type: String, required: true },
  userSignature: { type: String, required: true },
  userSubmitted: { type: Boolean, required: true },
  serverChecked: { type: Boolean, required: true },
  storedStatus: { type: String, enum: StoredStatusNames, required: false },
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
  requestedAtTimestamp: { type: Number, required: true }, // unix timestamp
  ipAddress: { type: String, required: true },
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
    requestedAtTimestamp: number,
    ipAddress: string,
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
    userAccount: string,
    dappAccount: string,
  ): Promise<UserCommitmentRecord[]>;

  approveDappUserCommitment(commitmentId: string): Promise<void>;

  disapproveDappUserCommitment(
    commitmentId: string,
    reason?: TranslationKey,
  ): Promise<void>;

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

  getUnstoredDappUserPoWCommitments(): Promise<PoWCaptchaStored[]>;

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
    difficulty: number,
    providerSignature: string,
    ipAddress: string,
    serverChecked?: boolean,
    userSubmitted?: boolean,
    storedStatus?: StoredStatus,
    userSignature?: string,
  ): Promise<void>;

  getPowCaptchaRecordByChallenge(
    challenge: string,
  ): Promise<PoWCaptchaStored | null>;

  updatePowCaptchaRecord(
    challenge: PoWChallengeId,
    result: CaptchaResult,
    serverChecked: boolean,
    userSubmitted: boolean,
    storedStatus: StoredStatusNames,
    userSignature?: string,
  ): Promise<void>;
}
