// Copyright 2021-2026 Prosopo (UK) Ltd.
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
	CaptchaType,
	type ClientContextEntropy,
	type CompositeIpAddress,
	ContextType,
	type DecisionMachineArtifact,
	DecisionMachineLanguage,
	DecisionMachineRuntime,
	DecisionMachineScope,
	type DetectorKey,
	IpAddressType,
	type PendingImageCaptchaRequest,
	type PoWCaptchaStored,
	type Session,
	type SolutionRecord,
	Tier,
	type UserCommitment,
	type UserSolutionSchema,
} from "@prosopo/types";
import {
	type Captcha,
	type CaptchaResult,
	type CaptchaSolution,
	type CaptchaStates,
	CaptchaStatus,
	type Dataset,
	type DatasetBase,
	type DatasetWithIds,
	type Hash,
	type IUserData,
	type Item,
	type PoWChallengeComponents,
	type PoWChallengeId,
	type RequestHeaders,
	ScheduledTaskNames,
	type ScheduledTaskResult,
	ScheduledTaskStatus,
} from "@prosopo/types";
import type { AccessRulesStorage } from "@prosopo/user-access-policy";
import type mongoose from "mongoose";
import { type Document, type Model, type ObjectId, Schema } from "mongoose";
import { any, date, nativeEnum, object, type infer as zInfer } from "zod";
import { UserSettingsSchema } from "./client.js";
import type { IDatabase } from "./mongo.js";

export type IUserDataSlim = Pick<IUserData, "account" | "settings" | "tier">;

export type ClientRecord = IUserDataSlim & Document;

const ONE_HOUR = 60 * 60;
const ONE_DAY = ONE_HOUR * 24;
const ONE_WEEK = ONE_DAY * 7;
const ONE_MONTH = ONE_WEEK * 4;

export const ClientRecordSchema = new Schema<ClientRecord>({
	account: String,
	settings: UserSettingsSchema,
	tier: { type: String, enum: Tier, required: true },
});
// Set an index on the account field, ascending
ClientRecordSchema.index({ account: 1 });

export const CompositeIpAddressRecordSchemaObj = {
	lower: {
		// INT64 isn't enough capable - it reserves extra bits for the sign bit, etc, so Decimal128 guarantees no overflow
		type: Schema.Types.Decimal128,
		required: true,
		// without casting to string Mongoose not able to set bigint to Decimal128
		set: (value: bigint | string | number) =>
			"bigint" === typeof value ? value.toString() : value,
	},
	upper: {
		// INT64 isn't enough capable - it reserves extra bits for the sign bit, etc, so Decimal128 guarantees no overflow
		type: Schema.Types.Decimal128,
		required: false,
		// without casting to string Mongoose not able to set bigint to Decimal128
		set: (value: bigint | string | number) =>
			"bigint" === typeof value ? value.toString() : value,
	},
	type: { type: String, enum: IpAddressType, required: true },
};

/**
 * Packed behavioral data format for efficient storage
 * c1: Mouse movement data (packed with delta encoding)
 * c2: Touch event data (packed with delta encoding)
 * c3: Click event data (packed with delta encoding)
 * d: Device capability string
 */

export type PoWCaptchaRecord = mongoose.Document & PoWCaptchaStored;

export type UserCommitmentRecord = mongoose.Document & UserCommitment;

export type Tables<E extends string | number | symbol> = {
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	[key in E]: typeof Model<any>;
};

export const CaptchaRecordSchema = new Schema<Captcha>({
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
// Set an index on the datasetId field, ascending
CaptchaRecordSchema.index({ datasetId: 1 });
// Set an index on the datasetId and solved fields, ascending
CaptchaRecordSchema.index({ datasetId: 1, solved: 1 });

export const PoWCaptchaRecordSchema = new Schema<PoWCaptchaRecord>({
	challenge: { type: String, required: true },
	dappAccount: { type: String, required: true },
	userAccount: { type: String, required: true },
	requestedAtTimestamp: { type: Date, required: true },
	lastUpdatedTimestamp: { type: Date, required: false },
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
	ipAddress: CompositeIpAddressRecordSchemaObj,
	providedIp: {
		type: new Schema(CompositeIpAddressRecordSchemaObj, { _id: false }),
		required: false,
	},
	headers: { type: Object, required: true },
	ja4: { type: String, required: true },
	userSignature: { type: String, required: false },
	userSubmitted: { type: Boolean, required: true },
	serverChecked: { type: Boolean, required: true },
	storedAtTimestamp: { type: Date, required: false, expires: ONE_MONTH },
	geolocation: { type: String, required: false },
	countryCode: { type: String, required: false },
	vpn: { type: Boolean, required: false },
	parsedUserAgentInfo: { type: Object, required: false },
	sessionId: {
		type: String,
		required: false,
	},
	coords: { type: [[[Number]]], required: false },
	// Legacy fields - kept for backward compatibility with existing data
	mouseEvents: { type: [Object], required: false },
	touchEvents: { type: [Object], required: false },
	clickEvents: { type: [Object], required: false },
	// Current behavioral data storage format (packed)
	deviceCapability: { type: String, required: false },
	behavioralDataPacked: {
		type: {
			c1: { type: [Schema.Types.Mixed], required: true },
			c2: { type: [Schema.Types.Mixed], required: true },
			c3: { type: [Schema.Types.Mixed], required: true },
			d: { type: String, required: true },
		},
		required: false,
	},
	providerSignature: { type: String, required: true },
});

// Set an index on the captchaId field, ascending
PoWCaptchaRecordSchema.index({ challenge: 1 });
PoWCaptchaRecordSchema.index({ lastUpdatedTimestamp: 1 });
PoWCaptchaRecordSchema.index({ dappAccount: 1, requestedAtTimestamp: 1 });
PoWCaptchaRecordSchema.index({ "ipAddress.lower": 1 });
PoWCaptchaRecordSchema.index({ "ipAddress.upper": 1 });
PoWCaptchaRecordSchema.index({ "result.reason": 1 });
PoWCaptchaRecordSchema.index({ countryCode: 1 });

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
	ipAddress: CompositeIpAddressRecordSchemaObj,
	providedIp: {
		type: new Schema(CompositeIpAddressRecordSchemaObj, { _id: false }),
		required: false,
	},
	headers: { type: Object, required: true },
	ja4: { type: String, required: true },
	userSignature: { type: String, required: true },
	userSubmitted: { type: Boolean, required: true },
	serverChecked: { type: Boolean, required: true },
	storedAtTimestamp: { type: Date, required: false, expires: ONE_MONTH },
	requestedAtTimestamp: { type: Date, required: true },
	lastUpdatedTimestamp: { type: Date, required: false },
	geolocation: { type: String, required: false },
	countryCode: { type: String, required: false },
	vpn: { type: Boolean, required: false },
	parsedUserAgentInfo: { type: Object, required: false },
	sessionId: {
		type: String,
		required: false,
	},
	coords: { type: [[[Number]]], required: false },
	// Pending request fields for image captcha workflow
	pending: { type: Boolean, required: true },
	salt: { type: String, required: true },
	requestHash: { type: String, required: true },
	deadlineTimestamp: { type: Date, required: true },
	threshold: { type: Number, required: true },
});
// Set an index on the commitment id field, descending
UserCommitmentRecordSchema.index({ id: -1 });
UserCommitmentRecordSchema.index({
	lastUpdatedTimestamp: 1,
});
UserCommitmentRecordSchema.index({ userAccount: 1, dappAccount: 1 });
UserCommitmentRecordSchema.index({ "ipAddress.lower": 1 });
UserCommitmentRecordSchema.index({ "ipAddress.upper": 1 });
UserCommitmentRecordSchema.index({ "result.reason": 1 });
UserCommitmentRecordSchema.index({ countryCode: 1 });
UserCommitmentRecordSchema.index({ requestHash: -1 });
UserCommitmentRecordSchema.index({ pending: 1 });

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
		createdAt: { type: Date, default: Date.now, expires: ONE_MONTH },
	},
	{ _id: false },
);
// Set an index on the captchaId field, ascending
UserSolutionRecordSchema.index({ captchaId: 1 });
// Set an index on the commitment id field, descending
UserSolutionRecordSchema.index({ commitmentId: -1 });

export const ScheduledTaskSchema = object({
	processName: nativeEnum(ScheduledTaskNames),
	datetime: date(),
	updated: date().optional(),
	status: nativeEnum(ScheduledTaskStatus),
	result: object({
		data: any().optional(),
		error: any().optional(),
	}).optional(),
});

export type ScheduledTask = zInfer<typeof ScheduledTaskSchema>;

export type ScheduledTaskRecord = mongoose.Document & ScheduledTask;

type ScheduledTaskMongoose = ScheduledTaskRecord;

export const ScheduledTaskRecordSchema = new Schema<ScheduledTaskMongoose>({
	processName: { type: String, enum: ScheduledTaskNames, required: true },
	datetime: { type: Date, required: true, expires: ONE_WEEK },
	updated: { type: Date, required: false },
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

export type SessionRecord = mongoose.Document & Session;

export const SessionRecordSchema = new Schema<SessionRecord>({
	sessionId: { type: String, required: true },
	createdAt: { type: Date, required: true },
	token: { type: String, required: true },
	score: { type: Number, required: true },
	threshold: { type: Number, required: true },
	scoreComponents: {
		baseScore: { type: Number, required: true },
		lScore: { type: Number, required: false },
		timeout: { type: Number, required: false },
		accessPolicy: { type: Number, required: false },
		unverifiedHost: { type: Number, required: false },
		webView: { type: Number, required: false },
	},
	providerSelectEntropy: { type: Number, required: true },
	ipAddress: CompositeIpAddressRecordSchemaObj,
	captchaType: { type: String, enum: CaptchaType, required: true },
	solvedImagesCount: { type: Number, required: false },
	powDifficulty: { type: Number, required: false },
	storedAtTimestamp: { type: Date, required: false, expires: ONE_DAY },
	lastUpdatedTimestamp: { type: Date, required: false },
	deleted: { type: Boolean, required: false },
	userSitekeyIpHash: { type: String, required: false },
	webView: { type: Boolean, required: true, default: false },
	iFrame: { type: Boolean, required: true, default: false },
	decryptedHeadHash: { type: String, required: false, default: "" },
	siteKey: { type: String, required: false },
	reason: { type: String, required: false },
	blocked: { type: Boolean, required: false },
	countryCode: { type: String, required: false },
});

SessionRecordSchema.index({ createdAt: 1 });
SessionRecordSchema.index({ deleted: 1 });
SessionRecordSchema.index({ blocked: 1 });
SessionRecordSchema.index({ sessionId: 1 }, { unique: true });
SessionRecordSchema.index({ userSitekeyIpHash: 1 });
SessionRecordSchema.index({ providerSelectEntropy: 1 });
SessionRecordSchema.index({ token: 1 });
SessionRecordSchema.index({ siteKey: 1 }, { background: true, sparse: true });
// Compound indexes for session aggregation queries
SessionRecordSchema.index({
	createdAt: 1,
	captchaType: 1,
	"scoreComponents.baseScore": 1,
});
SessionRecordSchema.index({ createdAt: 1, deleted: 1 });

export type DetectorSchema = mongoose.Document & DetectorKey;
export const DetectorRecordSchema = new Schema<DetectorSchema>({
	createdAt: { type: Date, required: true },
	detectorKey: { type: String, required: true },
	expiresAt: { type: Date, required: false },
});
DetectorRecordSchema.index({ createdAt: 1 }, { unique: true });
// TTL index for automatic cleanup of expired keys
DetectorRecordSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type DecisionMachineArtifactRecord = mongoose.Document &
	DecisionMachineArtifact;
export const DecisionMachineArtifactRecordSchema =
	new Schema<DecisionMachineArtifactRecord>({
		scope: {
			type: String,
			enum: Object.values(DecisionMachineScope),
			required: true,
		},
		dappAccount: { type: String, required: false, default: null },
		runtime: {
			type: String,
			enum: Object.values(DecisionMachineRuntime),
			required: true,
		},
		language: {
			type: String,
			enum: Object.values(DecisionMachineLanguage),
			required: false,
		},
		source: { type: String, required: true },
		name: { type: String, required: false },
		version: { type: String, required: false },
		captchaType: {
			type: String,
			enum: [CaptchaType.pow, CaptchaType.image],
			required: false,
		},
		createdAt: { type: Date, required: true },
		updatedAt: { type: Date, required: true },
	});
// Unique index: one artifact per (scope, dappAccount) combination
DecisionMachineArtifactRecordSchema.index(
	{ scope: 1, dappAccount: 1 },
	{ unique: true },
);
DecisionMachineArtifactRecordSchema.index({ updatedAt: -1 });

export type ClientContextEntropyRecord = mongoose.Document &
	ClientContextEntropy;
export const ClientContextEntropyRecordSchema =
	new Schema<ClientContextEntropyRecord>(
		{
			account: { type: String, required: true },
			contextType: {
				type: String,
				enum: Object.values(ContextType),
				required: true,
			},
			entropy: { type: String, required: true },
		},
		{ timestamps: { createdAt: true, updatedAt: true } },
	);
ClientContextEntropyRecordSchema.index(
	{ account: 1, contextType: 1 },
	{ unique: true },
);

export interface IProviderDatabase extends IDatabase {
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	tables: Tables<any>;

	ensureIndexes(): Promise<void>;

	storeDataset(dataset: Dataset): Promise<void>;

	getSolutions(datasetId: string): Promise<SolutionRecord[]>;

	getSolutionByCaptchaId(captchaId: string): Promise<SolutionRecord | null>;

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

	storeUserImageCaptchaSolution(
		captchas: CaptchaSolution[],
		commit: UserCommitment,
	): Promise<void>;

	storePendingImageCommitment(
		userAccount: string,
		requestHash: string,
		salt: string,
		deadlineTimestamp: Date,
		requestedAtTimestamp: Date,
		ipAddress: CompositeIpAddress,
		threshold: number,
		sessionId?: string,
		countryCode?: string,
	): Promise<void>;

	getPendingImageCommitment(
		requestHash: string,
	): Promise<PendingImageCaptchaRequest>;

	updatePendingImageCommitmentStatus(requestHash: string): Promise<void>;

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

	approveDappUserCommitment(
		commitmentId: string,
		coords?: [number, number][][],
	): Promise<void>;

	disapproveDappUserCommitment(
		commitmentId: string,
		reason?: TranslationKey,
		coords?: [number, number][][],
	): Promise<void>;

	getCheckedDappUserCommitments(): Promise<UserCommitmentRecord[]>;

	getUnstoredDappUserCommitments(
		limit?: number,
		skip?: number,
	): Promise<UserCommitmentRecord[]>;

	markDappUserCommitmentsStored(commitmentIds: Hash[]): Promise<void>;

	markDappUserCommitmentsChecked(commitmentIds: Hash[]): Promise<void>;

	updateDappUserCommitment(
		commitmentId: Hash,
		updates: Partial<UserCommitment>,
	): Promise<void>;

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
		ipAddress: CompositeIpAddress,
		headers: RequestHeaders,
		ja4: string,
		sessionId?: string,
		serverChecked?: boolean,
		userSubmitted?: boolean,
		userSignature?: string,
		countryCode?: string,
	): Promise<void>;

	getPowCaptchaRecordByChallenge(
		challenge: string,
	): Promise<PoWCaptchaRecord | null>;

	updatePowCaptchaRecordResult(
		challenge: PoWChallengeId,
		result: CaptchaResult,
		serverChecked: boolean,
		userSubmitted: boolean,
		userSignature?: string,
		coords?: [number, number][][],
	): Promise<void>;

	updatePowCaptchaRecord(
		challenge: PoWChallengeId,
		updates: Partial<PoWCaptchaRecord>,
	): Promise<void>;

	updateClientRecords(clientRecords: ClientRecord[]): Promise<void>;

	getAllClientRecords(): Promise<ClientRecord[]>;

	getClientRecord(account: string): Promise<ClientRecord | undefined>;

	storeSessionRecord(sessionRecord: Session): Promise<void>;

	getSessionRecordBySessionId(sessionId: string): Promise<Session | undefined>;

	getSessionRecordByToken(token: string): Promise<Session | undefined>;

	checkAndRemoveSession(sessionId: string): Promise<Session | undefined>;

	getSessionByuserSitekeyIpHash(
		userSitekeyIpHash: string,
	): Promise<SessionRecord | undefined>;

	getUnstoredSessionRecords(
		limit: number,
		skip: number,
	): Promise<SessionRecord[]>;

	markSessionRecordsStored(sessionIds: string[]): Promise<void>;

	getUserAccessRulesStorage(): AccessRulesStorage;

	storeDetectorKey(detectorKey: string): Promise<void>;

	getDetectorKeys(): Promise<string[]>;

	removeDetectorKey(
		detectorKey: string,
		expirationInSeconds?: number,
	): Promise<void>;

	upsertDecisionMachineArtifact(
		artifact: DecisionMachineArtifact,
	): Promise<void>;

	getDecisionMachineArtifact(
		scope: DecisionMachineScope,
		dappAccount?: string,
	): Promise<DecisionMachineArtifact | undefined>;

	setClientContextEntropy(
		account: string,
		contextType: ContextType,
		entropy: string,
	): Promise<void>;

	getClientContextEntropy(
		account: string,
		contextType: ContextType,
	): Promise<string | undefined>;

	sampleContextEntropy(
		sampleSize: number,
		siteKey: string,
		contextType: ContextType,
	): Promise<string[]>;
}
