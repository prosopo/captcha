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

import type { AllKeys } from "@prosopo/common";
import { type TranslationKey, TranslationKeysSchema } from "@prosopo/locale";
import {
	CaptchaLabel,
	CaptchaType,
	type ClientContextEntropy,
	type CompositeIpAddress,
	ContextType,
	type DecisionMachineArtifact,
	DecisionMachineKind,
	DecisionMachineLanguage,
	DecisionMachineRuntime,
	DecisionMachineScope,
	type DetectorKey,
	IpAddressType,
	ModeEnum,
	type PendingImageCaptchaRequest,
	type PoWCaptchaStored,
	type PuzzleCaptchaStored,
	type Session,
	type SimdReadingsStage,
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
	type IPInfoResponse,
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
import { Long } from "bson";
import type mongoose from "mongoose";
import { type Document, type Model, type ObjectId, Schema } from "mongoose";
import { any, date, nativeEnum, object, type infer as zInfer } from "zod";
import { UserSettingsSchema } from "./client.js";
import type { IDatabase } from "./mongo.js";
import type { SpamEmailDomainRecord } from "./spamEmailDomain.js";

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

// IP-half setter shared by `lower` and `upper`. Normalises every input
// shape the writers and the sweep can hand us into something Mongoose's
// Decimal128 caster will accept:
//
//   - `bigint`       — produced by `getCompositeIpAddress` on every fresh
//                      write; stringify so the caster sees a numeric
//                      string instead of an unsupported type.
//   - BSON `Long`    — produced when a *pipeline-form* update wrote a
//                      `bigint` value to disk (pipeline updates skip
//                      schema casting, so the driver serialised the
//                      bigint as Int64). The central-streaming sweep
//                      reads these via `.lean()` and replays them through
//                      `bulkWrite { $set: leanDoc }`; without this branch
//                      the cast throws and the entire batch aborts. Use
//                      the *unsigned* representation so an IPv6 lower
//                      with bit 63 set converts to a positive Decimal128
//                      — matching what `bigint→string` would have
//                      produced if the setter had run on write.
//   - everything else (string / number / Decimal128) — pass through; the
//                      caster handles them natively.
// Duck-typed Long check rather than `instanceof Long`: the MongoDB
// driver deserialises with its bundled `bson` copy, and hoisting
// differences can place that `Long` constructor on a different class
// identity than the one this file imports — which would silently skip
// normalisation here. Same defence as the helper in
// `CaptchaDatabase.normaliseCompositeIp` (database/captcha.ts).
const isBsonLong = (value: unknown): boolean =>
	typeof value === "object" &&
	value !== null &&
	"_bsontype" in value &&
	(value as { _bsontype: string })._bsontype === "Long";

const normaliseIpHalf = (
	value: bigint | number | string | Long | unknown,
): bigint | number | string | unknown => {
	if (typeof value === "bigint") return value.toString();
	if (isBsonLong(value)) {
		const lng = value as { low: number; high: number };
		return Long.fromBits(lng.low, lng.high, true).toString();
	}
	return value;
};

export const CompositeIpAddressRecordSchemaObj = {
	lower: {
		// INT64 isn't enough capable - it reserves extra bits for the sign bit, etc, so Decimal128 guarantees no overflow
		type: Schema.Types.Decimal128,
		required: true,
		set: normaliseIpHalf,
	},
	upper: {
		// INT64 isn't enough capable - it reserves extra bits for the sign bit, etc, so Decimal128 guarantees no overflow
		type: Schema.Types.Decimal128,
		required: false,
		set: normaliseIpHalf,
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

export type PuzzleCaptchaRecord = mongoose.Document & PuzzleCaptchaStored;

export type UserCommitmentRecord = mongoose.Document & UserCommitment;

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
	// Random pivot in [0,1) stamped at insert time and never updated.
	// Powers `ProviderDatabase.getRandomCaptcha`, which walks at most
	// `sampleSize` keys of the compound index below instead of
	// materialising the full matched set via `$sample`. Pre-existing
	// rows are filled by providerBackfillCaptchaRandomKey.yml.
	randomKey: { type: Number, required: false },
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
// Indexed random sampling — range scan on `randomKey` for a given
// (datasetId, solved) returns N random captchas in O(log n + N) instead
// of materialising the full matched set.
CaptchaRecordSchema.index({ datasetId: 1, solved: 1, randomKey: 1 });

export const PoWCaptchaRecordSchema = new Schema<PoWCaptchaRecord>({
	challenge: { type: String, required: true },
	dappAccount: { type: String, required: true },
	userAccount: { type: String, required: true },
	requestedAtTimestamp: { type: Date, required: true },
	submittedAtTimestamp: { type: Date, required: false },
	verifiedAtTimestamp: { type: Date, required: false },
	failedAtTimestamp: { type: Date, required: false },
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
	metadata: {
		type: new Schema(
			{ email: { type: String, required: false } },
			{ _id: false },
		),
		required: false,
	},
	clientMetaData: {
		type: new Schema({ hp: { type: String, required: false } }, { _id: false }),
		required: false,
	},
	headers: { type: Object, required: true },
	ja4: { type: String, required: true },
	userSignature: { type: String, required: false },
	userSubmitted: { type: Boolean, required: true },
	serverChecked: { type: Boolean, required: true },
	storedAtTimestamp: { type: Date, required: false, expires: ONE_MONTH },
	// See `StoredCaptcha.pendingStage` — `true` while the record has
	// unstaged changes. Indexed via a tiny partial index so the
	// StoreCommitmentsExternal sweep scans only pending rows instead of
	// the whole collection.
	pendingStage: { type: Boolean, required: false },
	// Full ipinfo payload. Replaces the flat `vpn`, `countryCode`,
	// `geolocation` and other per-flag fields — consumers narrow on
	// `ipInfo.isValid` and read whichever sub-field they need.
	ipInfo: { type: Object, required: false },
	parsedUserAgentInfo: { type: Object, required: false },
	sessionId: {
		type: String,
		required: false,
	},
	coords: { type: [[[Number]]], required: false },
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
	// Internal ML labelling applied by superadmins via the audit page.
	label: { type: String, enum: Object.values(CaptchaLabel), required: false },
	labelReason: { type: String, required: false },
	labelledBy: { type: String, required: false },
	labelledAt: { type: Date, required: false },
});

// Set an index on the captchaId field, ascending
PoWCaptchaRecordSchema.index({ challenge: 1 });
// Supports the labelled-dataset export query (`{ label: { $exists: true } }`).
PoWCaptchaRecordSchema.index({ label: 1, dappAccount: 1 });
PoWCaptchaRecordSchema.index({ lastUpdatedTimestamp: 1 });
PoWCaptchaRecordSchema.index({ dappAccount: 1, requestedAtTimestamp: 1 });
PoWCaptchaRecordSchema.index({ "ipAddress.lower": 1 });
PoWCaptchaRecordSchema.index({ "ipAddress.upper": 1 });
PoWCaptchaRecordSchema.index({ "result.reason": 1 });
PoWCaptchaRecordSchema.index({ "ipInfo.countryCode": 1 });
PoWCaptchaRecordSchema.index({ "ipInfo.isVPN": 1 });
// Supports the CHECK_IP_INFO / PARSE_USER_AGENT backfill queries
// (`{ <field>: { $exists: false } }`). Regular (non-sparse) indexes
// include entries for documents missing the field, which is what the
// planner needs for `$exists: false`. A partial filter can't help here:
// MongoDB rewrites `$exists: false` to `$not: { $exists: true }`, and
// `$not` isn't allowed inside `partialFilterExpression`.
PoWCaptchaRecordSchema.index({ ipInfo: 1 });
PoWCaptchaRecordSchema.index({ parsedUserAgentInfo: 1 });
// Tiny partial index serving the StoreCommitmentsExternal sweep. Only
// records with `pendingStage: true` are indexed — typically a small
// rolling set — so the query examines only the pending rows instead of
// scanning the whole powcaptchas collection.
PoWCaptchaRecordSchema.index(
	{ pendingStage: 1 },
	{
		name: "pendingStage_partial",
		partialFilterExpression: { pendingStage: true },
	},
);

export const PuzzleCaptchaRecordSchema = new Schema<PuzzleCaptchaRecord>({
	challenge: { type: String, required: true },
	dappAccount: { type: String, required: true },
	userAccount: { type: String, required: true },
	requestedAtTimestamp: { type: Date, required: true },
	submittedAtTimestamp: { type: Date, required: false },
	verifiedAtTimestamp: { type: Date, required: false },
	failedAtTimestamp: { type: Date, required: false },
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
	targetX: { type: Number, required: true },
	targetY: { type: Number, required: true },
	originX: { type: Number, required: true },
	originY: { type: Number, required: true },
	tolerance: { type: Number, required: true },
	puzzleEvents: {
		type: [
			new Schema<{ x: number; y: number; t: number }>(
				{
					x: { type: Number, required: true },
					y: { type: Number, required: true },
					t: { type: Number, required: true },
				},
				{ _id: false },
			),
		],
		required: false,
	},
	ipAddress: CompositeIpAddressRecordSchemaObj,
	providedIp: {
		type: new Schema(CompositeIpAddressRecordSchemaObj, { _id: false }),
		required: false,
	},
	metadata: {
		type: new Schema(
			{ email: { type: String, required: false } },
			{ _id: false },
		),
		required: false,
	},
	clientMetaData: {
		type: new Schema({ hp: { type: String, required: false } }, { _id: false }),
		required: false,
	},
	headers: { type: Object, required: true },
	ja4: { type: String, required: true },
	userSignature: { type: String, required: false },
	userSubmitted: { type: Boolean, required: true },
	serverChecked: { type: Boolean, required: true },
	storedAtTimestamp: { type: Date, required: false, expires: ONE_MONTH },
	// See `StoredCaptcha.pendingStage`.
	pendingStage: { type: Boolean, required: false },
	// Full ipinfo payload. Replaces the flat `vpn`, `countryCode`,
	// `geolocation` and other per-flag fields — consumers narrow on
	// `ipInfo.isValid` and read whichever sub-field they need.
	ipInfo: { type: Object, required: false },
	parsedUserAgentInfo: { type: Object, required: false },
	sessionId: {
		type: String,
		required: false,
	},
	coords: { type: [[[Number]]], required: false },
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

// Set an index on the challenge field, ascending
PuzzleCaptchaRecordSchema.index({ challenge: 1 });
PuzzleCaptchaRecordSchema.index({ lastUpdatedTimestamp: 1 });
PuzzleCaptchaRecordSchema.index({ dappAccount: 1, requestedAtTimestamp: 1 });
PuzzleCaptchaRecordSchema.index({ "ipAddress.lower": 1 });
PuzzleCaptchaRecordSchema.index({ "ipAddress.upper": 1 });
PuzzleCaptchaRecordSchema.index({ "result.reason": 1 });
PuzzleCaptchaRecordSchema.index({ "ipInfo.countryCode": 1 });
PuzzleCaptchaRecordSchema.index({ "ipInfo.isVPN": 1 });
PuzzleCaptchaRecordSchema.index({ ipInfo: 1 });
PuzzleCaptchaRecordSchema.index({ parsedUserAgentInfo: 1 });
PuzzleCaptchaRecordSchema.index(
	{ pendingStage: 1 },
	{
		name: "pendingStage_partial",
		partialFilterExpression: { pendingStage: true },
	},
);

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
	metadata: {
		type: new Schema(
			{ email: { type: String, required: false } },
			{ _id: false },
		),
		required: false,
	},
	clientMetaData: {
		type: new Schema({ hp: { type: String, required: false } }, { _id: false }),
		required: false,
	},
	headers: { type: Object, required: true },
	ja4: { type: String, required: true },
	userSignature: { type: String, required: true },
	userSubmitted: { type: Boolean, required: true },
	serverChecked: { type: Boolean, required: true },
	storedAtTimestamp: { type: Date, required: false, expires: ONE_MONTH },
	requestedAtTimestamp: { type: Date, required: true },
	submittedAtTimestamp: { type: Date, required: false },
	verifiedAtTimestamp: { type: Date, required: false },
	failedAtTimestamp: { type: Date, required: false },
	lastUpdatedTimestamp: { type: Date, required: false },
	// See `StoredCaptcha.pendingStage`.
	pendingStage: { type: Boolean, required: false },
	// Full ipinfo payload. Replaces the flat `vpn`, `countryCode`,
	// `geolocation` and other per-flag fields — consumers narrow on
	// `ipInfo.isValid` and read whichever sub-field they need.
	ipInfo: { type: Object, required: false },
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
	// Internal ML labelling applied by superadmins via the audit page.
	label: { type: String, enum: Object.values(CaptchaLabel), required: false },
	labelReason: { type: String, required: false },
	labelledBy: { type: String, required: false },
	labelledAt: { type: Date, required: false },
});
// Set an index on the commitment id field, descending
UserCommitmentRecordSchema.index({ id: -1 });
// Supports the labelled-dataset export query (`{ label: { $exists: true } }`).
UserCommitmentRecordSchema.index({ label: 1, dappAccount: 1 });
UserCommitmentRecordSchema.index({
	lastUpdatedTimestamp: 1,
});
UserCommitmentRecordSchema.index({ userAccount: 1, dappAccount: 1 });
UserCommitmentRecordSchema.index({ "ipAddress.lower": 1 });
UserCommitmentRecordSchema.index({ "ipAddress.upper": 1 });
UserCommitmentRecordSchema.index({ "result.reason": 1 });
UserCommitmentRecordSchema.index({ "ipInfo.countryCode": 1 });
UserCommitmentRecordSchema.index({ "ipInfo.isVPN": 1 });
UserCommitmentRecordSchema.index({ requestHash: -1 });
UserCommitmentRecordSchema.index({ pending: 1 });
UserCommitmentRecordSchema.index({ ipInfo: 1 });
UserCommitmentRecordSchema.index({ parsedUserAgentInfo: 1 });
UserCommitmentRecordSchema.index(
	{ pendingStage: 1 },
	{
		name: "pendingStage_partial",
		partialFilterExpression: { pendingStage: true },
	},
);

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
		triggeredDetectors: { type: [Number], required: false },
		shadowDomPenalty: { type: Boolean, required: false },
		dnsAsymmetry: { type: Number, required: false },
	},
	ipAddress: CompositeIpAddressRecordSchemaObj,
	captchaType: { type: String, enum: CaptchaType, required: true },
	mode: { type: String, enum: ModeEnum, required: false },
	solvedImagesCount: { type: Number, required: false },
	powDifficulty: { type: Number, required: false },
	storedAtTimestamp: { type: Date, required: false, expires: ONE_DAY },
	lastUpdatedTimestamp: { type: Date, required: false },
	// See `StoredCaptcha.pendingStage` — same semantics on Session records.
	pendingStage: { type: Boolean, required: false },
	deleted: { type: Boolean, required: false },
	userSitekeyIpHash: { type: String, required: false },
	webView: { type: Boolean, required: true, default: false },
	iFrame: { type: Boolean, required: true, default: false },
	decryptedHeadHash: { type: String, required: false, default: "" },
	siteKey: { type: String, required: false },
	// Full page URL the widget was rendered on (origin + path only; query
	// string, fragment and credentials stripped). See Session.currentUrl.
	currentUrl: { type: String, required: false },
	reason: { type: String, required: false },
	blocked: { type: Boolean, required: false },
	// On synthetic blocked-session records (blocked=true, deleted=true)
	// these carry the identity of the access-policy rule that fired at the
	// request-time block middleware — the Traffic page joins on these to
	// surface which rules are blocking traffic and at what volume.
	ruleHash: { type: String, required: false },
	ruleType: { type: [String], required: false },
	ruleDescription: { type: String, required: false },
	// Full ipinfo payload — replaces flat `countryCode` / `geolocation`
	// fields. Mirrors the captcha record schemas (PoW / Puzzle /
	// UserCommitment).
	ipInfo: { type: Object, required: false },
	headers: { type: Object, required: false },
	result: {
		type: new Schema(
			{
				status: {
					type: String,
					enum: Object.values(CaptchaStatus),
					required: true,
				},
				reason: { type: String, required: false },
				error: { type: String, required: false },
			},
			{ _id: false },
		),
		required: false,
	},
	userSubmitted: { type: Boolean, required: false },
	serverChecked: { type: Boolean, required: false },
	// WASM SIMD CPU fingerprint readings collected by the catcher client.
	// Stored as a free-form Mixed sub-document because the shape is a
	// discriminated union and the dataset is still evolving — Zod validates
	// at the boundary, Mongoose just persists it.
	simdReadings: { type: Schema.Types.Mixed, required: false },
	// Stage at which the SIMD readings first arrived on this session
	// (frictionless / challenge / submit). First-hop-wins.
	simdReadingsStage: { type: String, required: false },
	entropyMathRandomFingerprint: { type: String, required: false },
	entropyCryptoFingerprint: { type: String, required: false },
	entropyWallClockOffsetMs: { type: Number, required: false },
	entropyMathRandomFirst: { type: Number, required: false },
	// DNS observation merge target. Populated by
	// POST /v1/prosopo/provider/admin/dns/event from the dns-event
	// sidecar (see types/provider/database.ts → Session.dnsEvent).
	dnsEvent: {
		type: new Schema(
			{
				resolverIp: { type: String, required: false },
				peerIp: { type: String, required: false },
				pathValid: { type: Boolean, required: false },
				receivedAt: { type: Date, required: true },
			},
			{ _id: false },
		),
		required: false,
	},
} satisfies AllKeys<Session>);

SessionRecordSchema.index({ createdAt: 1 });
SessionRecordSchema.index({ deleted: 1 });
SessionRecordSchema.index({ blocked: 1 });
SessionRecordSchema.index({ sessionId: 1 }, { unique: true });
SessionRecordSchema.index({ userSitekeyIpHash: 1 });
SessionRecordSchema.index(
	{ siteKey: 1, entropyMathRandomFingerprint: 1, createdAt: -1 },
	{ sparse: true },
);
SessionRecordSchema.index({ token: 1 });
SessionRecordSchema.index({ siteKey: 1 }, { background: true, sparse: true });
// Traffic-page aggregations group blocked-session records by rule. Sparse
// so legit sessions (no rule fields) don't bloat the index.
SessionRecordSchema.index(
	{ siteKey: 1, blocked: 1, createdAt: 1 },
	{ background: true, sparse: true },
);
SessionRecordSchema.index({ ruleHash: 1 }, { background: true, sparse: true });
// Compound indexes for session aggregation queries
SessionRecordSchema.index({
	createdAt: 1,
	captchaType: 1,
	"scoreComponents.baseScore": 1,
});
SessionRecordSchema.index({ createdAt: 1, deleted: 1 });
// Index for querying session verification status
SessionRecordSchema.index(
	{ "result.status": 1 },
	{ background: true, sparse: true },
);
// See PoWCaptchaRecordSchema's pendingStage_partial — same purpose for
// the unstored-session sweep.
SessionRecordSchema.index(
	{ pendingStage: 1 },
	{
		name: "pendingStage_partial",
		partialFilterExpression: { pendingStage: true },
	},
);

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
		dappAccount: { type: String, required: false },
		kind: {
			type: String,
			enum: Object.values(DecisionMachineKind),
			required: false,
		},
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
			enum: [CaptchaType.pow, CaptchaType.image, CaptchaType.puzzle],
			required: false,
		},
		createdAt: { type: Date, required: true },
		updatedAt: { type: Date, required: true },
	});
// Unique index: one artifact per (scope, dappAccount, kind) combination
DecisionMachineArtifactRecordSchema.index(
	{ scope: 1, dappAccount: 1, kind: 1 },
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
		ipInfo?: IPInfoResponse,
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

	markDappUserCommitmentsStored(
		commitmentIds: Hash[],
		asOfTimestamp?: Date,
	): Promise<void>;

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

	markDappUserPoWCommitmentsStored(
		challengeIds: string[],
		asOfTimestamp?: Date,
	): Promise<void>;

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
		ipInfo?: IPInfoResponse,
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

	storePuzzleCaptchaRecord(
		challenge: PoWChallengeId,
		components: PoWChallengeComponents,
		targetX: number,
		targetY: number,
		originX: number,
		originY: number,
		tolerance: number,
		providerSignature: string,
		ipAddress: CompositeIpAddress,
		headers: RequestHeaders,
		ja4: string,
		sessionId?: string,
		ipInfo?: IPInfoResponse,
	): Promise<void>;

	getPuzzleCaptchaRecordByChallenge(
		challenge: string,
	): Promise<PuzzleCaptchaRecord | null>;

	updatePuzzleCaptchaRecordResult(
		challenge: PoWChallengeId,
		result: CaptchaResult,
		serverChecked: boolean,
		userSubmitted: boolean,
		userSignature?: string,
		coords?: [number, number][][],
		lastUpdatedTimestamp?: Date,
	): Promise<void>;

	updatePuzzleCaptchaRecord(
		challenge: PoWChallengeId,
		updates: Partial<PuzzleCaptchaRecord>,
	): Promise<void>;

	updateClientRecords(clientRecords: ClientRecord[]): Promise<void>;

	removeClientRecords(accounts: string[]): Promise<void>;

	getAllClientRecords(): Promise<ClientRecord[]>;

	getClientRecord(account: string): Promise<ClientRecord | undefined>;

	storeSessionRecord(sessionRecord: Session): Promise<void>;

	storeBlockedSession(sessionRecord: Session): Promise<void>;

	getSessionRecordBySessionId(sessionId: string): Promise<Session | undefined>;

	getSessionRecordByToken(token: string): Promise<Session | undefined>;

	checkAndRemoveSession(sessionId: string): Promise<Session | undefined>;

	updateSessionRecord(
		sessionId: string,
		updates: Partial<Session>,
		streamToCentral?: boolean,
	): Promise<void>;

	/**
	 * Record SIMD CPU fingerprint readings on the session — first hop wins.
	 * Atomically sets both `simdReadings` and `simdReadingsStage` only when
	 * the session does not already carry readings, so re-attaches on later
	 * hops are no-ops at the storage layer. Pure Mongo write; provider-side
	 * callers refresh the Redis cache via
	 * `RedisWriteQueue.patchCachedSimdReadingsIfAbsent`.
	 */
	recordSessionSimdReadingsIfAbsent(
		sessionId: string,
		readings: NonNullable<Session["simdReadings"]>,
		stage: SimdReadingsStage,
	): Promise<void>;

	/**
	 * Merge a partial dnsEvent observation into the session record using
	 * dotted-path `$set` so DNS-leg and HTTP-leg events can both land on
	 * the same session without read-modify-write races. `receivedAt` is
	 * only written if absent (`$setOnInsert`-style behaviour via $set
	 * + a `$cond` would over-complicate; instead, the caller passes
	 * `receivedAtIfAbsent` and we set it unconditionally only when no
	 * field already exists). Returns true if the session existed.
	 */
	mergeSessionDnsEvent(
		sessionId: string,
		fields: {
			resolverIp?: string;
			peerIp?: string;
			pathValid?: boolean;
		},
		receivedAtIfAbsent: Date,
	): Promise<boolean>;

	getSessionByuserSitekeyIpHash(
		userSitekeyIpHash: string,
	): Promise<SessionRecord | undefined>;

	getUnstoredSessionRecords(
		limit: number,
		skip: number,
	): Promise<SessionRecord[]>;

	markSessionRecordsStored(
		sessionIds: string[],
		asOfTimestamp?: Date,
	): Promise<void>;

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
		kind?: DecisionMachineKind,
	): Promise<DecisionMachineArtifact | undefined>;

	getAllDecisionMachineArtifacts(): Promise<
		(DecisionMachineArtifact & { _id: string })[]
	>;

	getDecisionMachineArtifactById(
		id: string,
	): Promise<(DecisionMachineArtifact & { _id: string }) | undefined>;

	removeDecisionMachineArtifact(id: string): Promise<boolean>;

	removeAllDecisionMachineArtifacts(): Promise<number>;

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

	getSpamEmailDomain(domain: string): Promise<SpamEmailDomainRecord | null>;

	bulkUpdateSpamEmailDomains(
		domains: Array<{ filter: { domain: string }; update: { domain: string } }>,
		upsert: boolean,
	): Promise<void>;
}
