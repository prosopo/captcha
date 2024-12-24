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

import { type TranslationKey, TranslationKeysSchema } from "@prosopo/locale";
import {
	type BlockRule,
	BlockRuleType,
	type Captcha,
	type CaptchaResult,
	type CaptchaSolution,
	CaptchaSolutionSchema,
	type CaptchaStates,
	CaptchaStatus,
	type Commit,
	type Dataset,
	type DatasetBase,
	type DatasetWithIds,
	type Hash,
	type IUserData,
	type Item,
	type PendingCaptchaRequest,
	type PoWCaptchaUser,
	type PoWChallengeComponents,
	type PoWChallengeId,
	ProsopoCaptchaCountConfigSchema,
	type RequestHeaders,
	ScheduledTaskNames,
	type ScheduledTaskResult,
	ScheduledTaskStatus,
	type Timestamp,
	TimestampSchema,
} from "@prosopo/types";
import mongoose from "mongoose";
import { type Document, type Model, type ObjectId, Schema } from "mongoose";
import {
	type ZodType,
	any,
	array,
	bigint,
	boolean,
	nativeEnum,
	object,
	string,
	type infer as zInfer,
} from "zod";
import { UserSettingsSchema } from "./client.js";
import type { IDatabase } from "./mongo.js";

export * from "./provider/export.js";

export type IUserDataSlim = Pick<IUserData, "account" | "settings">;

export type ClientRecord = IUserDataSlim & Document;

const TEN_MINUTES = 60 * 10;
const ONE_DAY = 60 * 60 * 24;
const ONE_WEEK = ONE_DAY * 7;
const ONE_MONTH = ONE_WEEK * 4;

export const ClientRecordSchema = new Schema<ClientRecord>({
	account: String,
	settings: UserSettingsSchema,
});
// Set an index on the account field, ascending
ClientRecordSchema.index({ account: 1 });

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
		reason?: TranslationKey;
		error?: string;
	};
	requestedAtTimestamp: Timestamp;
	deadlineTimestamp?: Timestamp;
	ipAddress: bigint;
	headers: RequestHeaders;
	userSubmitted: boolean;
	serverChecked: boolean;
	storedAtTimestamp?: Timestamp;
	lastUpdatedTimestamp?: Timestamp;
}

export interface UserCommitment extends Commit, StoredCaptcha {
	userSignature: string;
}

export interface PoWCaptchaStored extends PoWCaptchaUser, StoredCaptcha {}

const CaptchaResultSchema = object({
	status: nativeEnum(CaptchaStatus),
	reason: TranslationKeysSchema.optional(),
	error: string().optional(),
}) satisfies ZodType<CaptchaResult>;

export const UserCommitmentSchema = object({
	userAccount: string(),
	dappAccount: string(),
	datasetId: string(),
	providerAccount: string(),
	id: string(),
	result: CaptchaResultSchema,
	userSignature: string(),
	ipAddress: bigint(),
	headers: object({}).catchall(string()),
	userSubmitted: boolean(),
	serverChecked: boolean(),
	storedAtTimestamp: TimestampSchema.optional(),
	requestedAtTimestamp: TimestampSchema,
	lastUpdatedTimestamp: TimestampSchema.optional(),
}) satisfies ZodType<UserCommitment>;

export interface SolutionRecord extends CaptchaSolution {
	datasetId: string;
	datasetContentId: string;
}

export type Tables<E extends string | number | symbol> = {
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	[key in E]: typeof Model<any>;
};

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

export type PoWCaptchaRecord = mongoose.Document & PoWCaptchaStored;

export type UserCommitmentRecord = mongoose.Document & UserCommitment;

export const PoWCaptchaRecordSchema = new Schema<PoWCaptchaRecord>({
	challenge: { type: String, required: true },
	dappAccount: { type: String, required: true },
	userAccount: { type: String, required: true },
	requestedAtTimestamp: { type: Number, required: true },
	lastUpdatedTimestamp: { type: Number, required: false },
	result: {
		status: { type: String, enum: CaptchaStatus, required: true },
		reason: {
			type: String,
			enum: TranslationKeysSchema.options,
			required: false,
		},
		error: { type: String, required: false },
	},
	difficulty: { type: Number, required: true },
	ipAddress: { type: BigInt, required: true },
	headers: { type: Object, required: true },
	userSignature: { type: String, required: false },
	userSubmitted: { type: Boolean, required: true },
	serverChecked: { type: Boolean, required: true },
	storedAtTimestamp: { type: Date, required: false, expires: ONE_MONTH },
});

// Set an index on the captchaId field, ascending
PoWCaptchaRecordSchema.index({ challenge: 1 });
PoWCaptchaRecordSchema.index({ storedAtTimestamp: 1 });
PoWCaptchaRecordSchema.index({ storedAtTimestamp: 1, lastUpdatedTimestamp: 1 });

export const UserCommitmentRecordSchema = new Schema<UserCommitmentRecord>({
	userAccount: { type: String, required: true },
	dappAccount: { type: String, required: true },
	providerAccount: { type: String, required: true },
	datasetId: { type: String, required: true },
	id: { type: String, required: true },
	result: {
		status: { type: String, enum: CaptchaStatus, required: true },
		reason: {
			type: String,
			enum: TranslationKeysSchema.options,
			required: false,
		},
		error: { type: String, required: false },
	},
	ipAddress: { type: BigInt, required: true },
	headers: { type: Object, required: true },
	userSignature: { type: String, required: true },
	userSubmitted: { type: Boolean, required: true },
	serverChecked: { type: Boolean, required: true },
	storedAtTimestamp: { type: Number, required: false },
	requestedAtTimestamp: { type: Number, required: true },
	lastUpdatedTimestamp: { type: Number, required: false },
});
// Set an index on the commitment id field, descending
UserCommitmentRecordSchema.index({ id: -1 });
UserCommitmentRecordSchema.index({ storedAtTimestamp: 1 });
UserCommitmentRecordSchema.index({
	storedAtTimestamp: 1,
	lastUpdatedTimestamp: 1,
});
UserCommitmentRecordSchema.index({ userAccount: 1, dappAccount: 1 });

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
export type UserSolutionRecord = mongoose.Document &
	zInfer<typeof UserSolutionSchema>;
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
// Set an index on the commitment id field, descending
UserSolutionRecordSchema.index({ commitmentId: -1 });

export const UserCommitmentWithSolutionsSchema = UserCommitmentSchema.extend({
	captchas: array(UserSolutionSchema),
});

export type UserCommitmentWithSolutions = zInfer<
	typeof UserCommitmentWithSolutionsSchema
>;

type PendingCaptchaRequestMongoose = Omit<
	PendingCaptchaRequest,
	"requestedAtTimestamp"
> & {
	requestedAtTimestamp: Date;
};

export const PendingRecordSchema = new Schema<PendingCaptchaRequestMongoose>({
	accountId: { type: String, required: true },
	pending: { type: Boolean, required: true },
	salt: { type: String, required: true },
	requestHash: { type: String, required: true },
	deadlineTimestamp: { type: Number, required: true }, // unix timestamp
	requestedAtTimestamp: { type: Date, required: true, expires: ONE_WEEK },
	ipAddress: { type: BigInt, required: true },
	headers: { type: Object, required: true },
});
// Set an index on the requestHash field, descending
PendingRecordSchema.index({ requestHash: -1 });

export const ScheduledTaskSchema = object({
	processName: nativeEnum(ScheduledTaskNames),
	datetime: TimestampSchema,
	updated: TimestampSchema.optional(),
	status: nativeEnum(ScheduledTaskStatus),
	result: object({
		data: any().optional(),
		error: any().optional(),
	}).optional(),
});

export type ScheduledTask = zInfer<typeof ScheduledTaskSchema>;

export type ScheduledTaskRecord = mongoose.Document & ScheduledTask;

type ScheduledTaskMongoose = Omit<ScheduledTaskRecord, "datetime"> & {
	datetime: Date;
};

export const ScheduledTaskRecordSchema = new Schema<ScheduledTaskMongoose>({
	processName: { type: String, enum: ScheduledTaskNames, required: true },
	datetime: { type: Date, required: true, expires: ONE_WEEK },
	updated: { type: Number, required: false },
	status: { type: String, enum: ScheduledTaskStatus, required: true },
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
ScheduledTaskRecordSchema.index({ processName: 1 });
ScheduledTaskRecordSchema.index({ processName: 1, status: 1 });
ScheduledTaskRecordSchema.index({ _id: 1, status: 1 });

export type FrictionlessToken = {
	token: string;
	score: number;
	threshold: number;
};

export type FrictionlessTokenRecord = mongoose.Document & FrictionlessToken;

type FrictionlessTokenMongoose = FrictionlessTokenRecord & {
	createdAt: Date;
};

export const FrictionlessTokenRecordSchema =
	new Schema<FrictionlessTokenMongoose>({
		token: { type: String, required: true, unique: true },
		score: { type: Number, required: true },
		threshold: { type: Number, required: true },
		createdAt: { type: Date, default: Date.now, expires: ONE_DAY },
	});

FrictionlessTokenRecordSchema.index({ token: 1 }, { unique: true });

export type Session = {
	sessionId: string;
	createdAt: Date;
	tokenId: ObjectId;
};

export type SessionRecord = mongoose.Document & Session;

export const SessionRecordSchema = new Schema<SessionRecord>({
	sessionId: { type: String, required: true, unique: true },
	createdAt: { type: Date, required: true, expires: TEN_MINUTES },
	tokenId: {
		type: mongoose.Schema.Types.ObjectId,
	},
});

SessionRecordSchema.index({ sessionId: 1 }, { unique: true });

export interface IPAddressBlockRule extends BlockRule {
	ip: number;
	dappAccount?: string;
}

export interface UserAccountBlockRule extends BlockRule {
	dappAccount?: string;
	userAccount: string;
}

// A rule to block users based on headers such as IP. Global rules apply to all clients.
export type IPBlockRuleRecord = mongoose.Document & IPAddressBlockRule;
export type UserAccountBlockRuleRecord = mongoose.Document &
	UserAccountBlockRule;

export type IPBlockRuleMongo = Omit<IPBlockRuleRecord, "ip"> & {
	ip: number;
};

export const IPBlockRuleRecordSchema = new Schema<IPBlockRuleRecord>({
	ip: { type: Number, required: true, unique: true },
	global: { type: Boolean, required: true },
	type: { type: String, enum: BlockRuleType, required: true },
	dappAccount: { type: String, required: false },
	hardBlock: { type: Boolean, required: false },
	captchaConfig: {
		solved: { count: { type: Number, required: false } },
		unsolved: { count: { type: Number, required: false } },
	},
});

IPBlockRuleRecordSchema.index({ ip: 1 }, { unique: true });
IPBlockRuleRecordSchema.index({ ip: 1, dappAccount: 1 }, { unique: true });

export const UserAccountBlockRuleSchema =
	new Schema<UserAccountBlockRuleRecord>({
		dappAccount: { type: String, required: false },
		userAccount: { type: String, required: true },
		global: { type: Boolean, required: true },
		hardBlock: { type: Boolean, required: false },
		type: { type: String, enum: BlockRuleType, required: true },
		captchaConfig: {
			solved: { count: { type: Number, required: false } },
			unsolved: { count: { type: Number, required: false } },
		},
	});

UserAccountBlockRuleSchema.index({ userAccount: 1 }, { unique: true });
UserAccountBlockRuleSchema.index(
	{ dappAccount: 1, userAccount: 1 },
	{ unique: true },
);

export interface IProviderDatabase extends IDatabase {
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	tables: Tables<any>;

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
		commit: UserCommitment,
	): Promise<void>;

	storeDappUserPending(
		userAccount: string,
		requestHash: string,
		salt: string,
		deadlineTimestamp: number,
		requestedAtTimestamp: number,
		ipAddress: bigint,
		headers: RequestHeaders,
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
	): Promise<UserCommitment | undefined>;

	getDappUserCommitmentByAccount(
		userAccount: string,
		dappAccount: string,
	): Promise<UserCommitmentRecord[]>;

	approveDappUserCommitment(commitmentId: string): Promise<void>;

	disapproveDappUserCommitment(
		commitmentId: string,
		reason?: TranslationKey,
	): Promise<void>;

	getCheckedDappUserCommitments(): Promise<UserCommitmentRecord[]>;

	getUnstoredDappUserCommitments(
		limit?: number,
		skip?: number,
	): Promise<UserCommitmentRecord[]>;

	markDappUserCommitmentsStored(commitmentIds: Hash[]): Promise<void>;

	markDappUserCommitmentsChecked(commitmentIds: Hash[]): Promise<void>;

	getUnstoredDappUserPoWCommitments(
		limit?: number,
		skip?: number,
	): Promise<PoWCaptchaRecord[]>;

	markDappUserPoWCommitmentsChecked(challengeIds: string[]): Promise<void>;

	markDappUserPoWCommitmentsStored(challengeIds: string[]): Promise<void>;

	flagProcessedDappUserSolutions(captchaIds: Hash[]): Promise<void>;

	flagProcessedDappUserCommitments(commitmentIds: Hash[]): Promise<void>;

	getLastScheduledTaskStatus(
		task: ScheduledTaskNames,
		status?: ScheduledTaskStatus,
	): Promise<ScheduledTaskRecord | undefined>;

	getScheduledTaskStatus(
		taskId: ObjectId,
		status: ScheduledTaskStatus,
	): Promise<ScheduledTaskRecord | undefined>;

	createScheduledTaskStatus(
		task: ScheduledTaskNames,
		status: ScheduledTaskStatus,
	): Promise<ObjectId>;

	updateScheduledTaskStatus(
		taskId: ObjectId,
		status: ScheduledTaskStatus,
		result?: ScheduledTaskResult,
	): Promise<void>;

	storePowCaptchaRecord(
		challenge: PoWChallengeId,
		components: PoWChallengeComponents,
		difficulty: number,
		providerSignature: string,
		ipAddress: bigint,
		headers: RequestHeaders,
		serverChecked?: boolean,
		userSubmitted?: boolean,
		userSignature?: string,
	): Promise<void>;

	getPowCaptchaRecordByChallenge(
		challenge: string,
	): Promise<PoWCaptchaRecord | null>;

	updatePowCaptchaRecord(
		challenge: PoWChallengeId,
		result: CaptchaResult,
		serverChecked: boolean,
		userSubmitted: boolean,
		userSignature?: string,
	): Promise<void>;

	updateClientRecords(clientRecords: ClientRecord[]): Promise<void>;

	getClientRecord(account: string): Promise<ClientRecord | undefined>;

	storeFrictionlessTokenRecord(
		tokenRecord: FrictionlessToken,
	): Promise<ObjectId>;

	checkFrictionlessTokenRecord(token: string): Promise<boolean>;

	storeSessionRecord(sessionRecord: Session): Promise<void>;

	checkAndRemoveSession(sessionId: string): Promise<Session | undefined>;

	getIPBlockRuleRecord(
		ipAddress: bigint,
		dappAccount?: string,
	): Promise<IPBlockRuleMongo | undefined>;

	storeIPBlockRuleRecords(rules: IPAddressBlockRule[]): Promise<void>;

	removeIPBlockRuleRecords(ips: bigint[], dappAccount?: string): Promise<void>;

	getUserBlockRuleRecord(
		userAccount: string,
		dappAccount: string,
	): Promise<UserAccountBlockRuleRecord | undefined>;

	storeUserBlockRuleRecords(rules: UserAccountBlockRule[]): Promise<void>;

	removeUserBlockRuleRecords(
		users: string[],
		dappAccount?: string,
	): Promise<void>;
}
