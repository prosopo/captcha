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

import {
	CaptchaType,
	DEFAULT_POW_CAPTCHA_SOLUTION_TIMEOUT,
	DEFAULT_POW_CAPTCHA_VERIFIED_TIMEOUT,
	type IUserData,
	type IUserSettings,
	type Timestamp,
	TrafficFilterAction,
	abuseScoreThresholdDefault,
	abuseScoreThresholdExceedActionDefault,
	captchaTypeDefault,
	cityChangeActionDefault,
	contextAwareThresholdDefault,
	countryChangeActionDefault,
	deviceContextTypes,
	distanceExceedActionDefault,
	distanceThresholdKmDefault,
	domainsDefault,
	frictionlessThresholdDefault,
	frictionlessTypesDefault,
	imageMaxRoundsDefault,
	imageThresholdDefault,
	ispChangeActionDefault,
	powDifficultyDefault,
	requireAllConditionsDefault,
} from "@prosopo/types";
import mongoose from "mongoose";
import { Schema as MongooseSchema, Schema } from "mongoose";
import type { IDatabase } from "./mongo.js";
import type { ClientRecord, Tables } from "./provider.js";

export type UserDataRecord = mongoose.Document & IUserData;

export const IPValidationRulesSchema = new Schema({
	enabled: {
		type: Boolean,
		default: false,
		required: true,
	},
	actions: {
		countryChangeAction: {
			type: Schema.Types.Mixed,
			default: () => countryChangeActionDefault,
		},
		cityChangeAction: {
			type: Schema.Types.Mixed,
			default: () => cityChangeActionDefault,
		},
		ispChangeAction: {
			type: Schema.Types.Mixed,
			default: () => ispChangeActionDefault,
		},
		distanceExceedAction: {
			type: Schema.Types.Mixed,
			default: () => distanceExceedActionDefault,
		},
		abuseScoreExceedAction: {
			type: Schema.Types.Mixed,
			default: () => abuseScoreThresholdExceedActionDefault,
		},
	},

	distanceThresholdKm: {
		type: Number,
		min: 0,
		default: distanceThresholdKmDefault,
	},

	abuseScoreThreshold: {
		type: Number,
		min: 0,
		default: abuseScoreThresholdDefault,
	},

	requireAllConditions: {
		type: Boolean,
		default: requireAllConditionsDefault,
	},

	forceConsistentIp: {
		type: Boolean,
		default: false,
	},

	countryOverrides: {
		type: Map,
		of: new Schema({
			actions: {
				countryChangeAction: { type: Schema.Types.Mixed },
				cityChangeAction: { type: Schema.Types.Mixed },
				ispChangeAction: { type: Schema.Types.Mixed },
				distanceExceedAction: { type: Schema.Types.Mixed },
				abuseScoreExceedAction: { type: Schema.Types.Mixed },
			},
			distanceThresholdKm: { type: Number, min: 0 },
			abuseScoreThreshold: { type: Number, min: 0 },
			requireAllConditions: { type: Boolean },
		}),
		default: undefined,
	},
});

// Sub-schema for one trafficFilter category's policy. `_id: false` prevents
// Mongoose from stamping an implicit ObjectId onto each subdoc.
export const TrafficCategoryPolicySchema = new Schema(
	{
		action: {
			type: String,
			enum: TrafficFilterAction,
			required: true,
		},
		captchaType: {
			type: String,
			enum: CaptchaType,
			required: false,
		},
		powDifficulty: { type: Number, required: false },
		solvedImagesCount: { type: Number, required: false },
		puzzleTolerance: { type: Number, required: false },
	},
	{ _id: false },
);

export const UserSettingsSchema = new Schema({
	captchaType: {
		type: String,
		enum: CaptchaType,
		default: captchaTypeDefault,
	},
	verifiedTimeout: {
		type: Number,
		default: DEFAULT_POW_CAPTCHA_VERIFIED_TIMEOUT,
	},
	solutionTimeout: {
		type: Number,
		default: DEFAULT_POW_CAPTCHA_SOLUTION_TIMEOUT,
	},
	// The score ladder. Declared `Mixed` rather than as a nested schema
	// because the field used to hold a bare number and unmigrated documents
	// still do: a typed sub-document would make mongoose cast-fail on read
	// instead of letting `resolveScoreLadder` interpret it. Zod owns the
	// shape; this just has to not throw the value away.
	frictionlessThreshold: {
		type: MongooseSchema.Types.Mixed,
		default: () => ({ ...frictionlessThresholdDefault }),
	},
	// Which challenge types the frictionless flow may serve. Declared here
	// because mongoose is strict by default: a field absent from the schema is
	// silently dropped on write, so without this the setting round-trips
	// through zod, reaches the database, and vanishes — leaving the provider to
	// read `undefined` and serve every type as though nothing were disabled.
	//
	// `_id: false` because this is a value object, not a document; mongoose
	// would otherwise stamp an ObjectId into every site's settings.
	frictionlessTypes: {
		type: new Schema(
			{
				image: { type: Boolean, default: true },
				puzzle: { type: Boolean, default: true },
			},
			{ _id: false },
		),
		default: () => ({ ...frictionlessTypesDefault }),
	},
	powDifficulty: { type: Number, default: powDifficultyDefault },
	imageThreshold: {
		type: Number,
		default: imageThresholdDefault,
	},
	imageMaxRounds: {
		type: Number,
		default: imageMaxRoundsDefault,
		required: false,
	},
	puzzleTolerance: {
		type: Number,
		required: false,
	},
	ipValidationRules: IPValidationRulesSchema,
	domains: {
		type: [String],
		default: domainsDefault,
	},
	disallowWebView: {
		type: Boolean,
		default: false,
	},
	contextAware: {
		enabled: { type: Boolean, default: false },
		contexts: {
			type: mongoose.Schema.Types.Mixed,
			// One entry per device family x webview. Records written before
			// device contexts existed carry `default`/`webview` instead; those
			// keys still parse and `expandContexts` maps them onto these
			// families, so nothing needs backfilling.
			default: Object.fromEntries(
				deviceContextTypes.map((type) => [
					type,
					{ type, threshold: contextAwareThresholdDefault },
				]),
			),
		},
	},
	spamEmailDomainCheckEnabled: {
		type: Boolean,
		default: false,
		required: false,
	},
	autoBanScoreThreshold: {
		type: Number,
		min: 0,
		required: false,
	},
	spamFilter: {
		enabled: { type: Boolean, default: false },
		emailRules: {
			enabled: { type: Boolean, default: false },
			maxLocalPartDots: { type: Number, required: false },
			normaliseGmail: { type: Boolean, default: false },
			useDefaultPatterns: { type: Boolean, default: false },
			customRegexBlocklist: { type: [String], default: [] },
			maxEmailSubmissionCount: { type: Number, min: 1, required: false },
		},
	},
	trafficFilter: {
		vpn: { type: TrafficCategoryPolicySchema, required: false },
		proxy: { type: TrafficCategoryPolicySchema, required: false },
		tor: { type: TrafficCategoryPolicySchema, required: false },
		abuser: { type: TrafficCategoryPolicySchema, required: false },
		abuserScoreThreshold: { type: Number, min: 0, max: 1, default: 0 },
		datacenter: { type: TrafficCategoryPolicySchema, required: false },
		datacenterNameAllowlist: { type: [String], required: false },
		datacenterNameDenylist: { type: [String], required: false },
		skipExtrasOnValidDnsPath: { type: Boolean, default: true },
		mobile: { type: TrafficCategoryPolicySchema, required: false },
		satellite: { type: TrafficCategoryPolicySchema, required: false },
		crawler: { type: TrafficCategoryPolicySchema, required: false },
	},
	storeMetadata: {
		type: Boolean,
		default: false,
		required: false,
	},
	honeypot: {
		enabled: { type: Boolean, default: false },
		question: { type: String, required: false },
		encodingType: {
			type: String,
			enum: ["morse", "semaphore"],
			default: "morse",
		},
	},
});

export const UserDataSchema: mongoose.Schema<UserDataRecord> = new Schema({
	email: String,
	name: String,
	account: String,
	url: String,
	mnemonic: String,
	createdAt: Date,
	activated: Boolean,
	tier: String,
	settings: {
		type: UserSettingsSchema,
		required: false,
	},
	updatedAtTimestamp: Date,
});

type User = {
	email: string;
	name: string;
	role: string;
	createdAt: number;
	updatedAt: number;
	status: string;
};

type AccountRecord = mongoose.Document & {
	createdAt: number;
	updatedAt: number;
	signupEmail: string;
	tier: string;
	tierRequestQuota: number;
	marketingPreferences: boolean;
	users: User[];
	sites: {
		name: string;
		siteKey: string;
		secretKey: string;
		settings: IUserSettings;
		createdAt: number;
		updatedAt: number;
		active: boolean;
	}[];
	deletedUsers: User[];
};

// Account format
export const AccountSchema = new Schema<AccountRecord>({
	createdAt: Number,
	updatedAt: Number,
	signupEmail: String,
	tier: String,
	tierRequestQuota: Number,
	marketingPreferences: Boolean,
	users: [
		{
			email: String,
			name: String,
			role: String,
			createdAt: Number,
			updatedAt: Number,
			status: String,
		},
	],
	sites: [
		{
			name: String,
			siteKey: String,
			secretKey: String,
			settings: {
				domains: [String],
				powDifficulty: Number,
				captchaType: String,
				frictionlessThreshold: MongooseSchema.Types.Mixed,
				frictionlessTypes: MongooseSchema.Types.Mixed,
				ipValidationRules: IPValidationRulesSchema,
			},
			createdAt: Number,
			updatedAt: Number,
			active: Boolean,
		},
	],
	deletedUsers: [],
});

export enum TableNames {
	accounts = "accounts",
}

export interface IClientDatabase extends IDatabase {
	getTables(): Tables<TableNames>;
	getUpdatedClients(updatedAtTimestamp: Timestamp): Promise<ClientRecord[]>;
}
