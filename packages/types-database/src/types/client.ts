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
	ContextType,
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
	distanceExceedActionDefault,
	distanceThresholdKmDefault,
	domainsDefault,
	frictionlessThresholdDefault,
	imageMaxRoundsDefault,
	imageThresholdDefault,
	ispChangeActionDefault,
	powDifficultyDefault,
	requireAllConditionsDefault,
} from "@prosopo/types";
import mongoose from "mongoose";
import { Schema } from "mongoose";
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

// Per-render tunables for the puzzle and audio captchas.
//
// Mongoose silently drops any path it has not been told about, so a
// settings key that exists in the zod schema but not here round-trips as
// `undefined` — the write appears to succeed and the value is simply
// gone. `puzzle` was in exactly that state: `getPuzzleCaptchaChallenge`
// reads `clientSettings.settings.puzzle` and the portal offers a card to
// set it, but there was no path here, so every operator override was
// discarded on save and the renderer always fell back to defaults.
//
// `_id: false` stops Mongoose stamping an implicit ObjectId onto each
// subdoc.
export const PuzzleRenderSettingsSchema = new Schema(
	{
		decoyCount: { type: Number, required: false },
		decoyEdgeDarkness: { type: Number, required: false },
		decoyBodyBrightness: { type: Number, required: false },
		decoyHoleDarken: { type: Number, required: false },
		holeDarken: { type: Number, required: false },
		pieceScale: {
			type: new Schema(
				{
					min: { type: Number, required: false },
					max: { type: Number, required: false },
				},
				{ _id: false },
			),
			required: false,
		},
	},
	{ _id: false },
);

export const AudioRenderSettingsSchema = new Schema(
	{
		digitCount: { type: Number, required: false },
		noiseSnrDb: { type: Number, required: false },
		babbleGain: { type: Number, required: false },
		babbleVoices: { type: Number, required: false },
		reverbMix: { type: Number, required: false },
		gapMs: { type: Number, required: false },
	},
	{ _id: false },
);

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
		puzzle: { type: PuzzleRenderSettingsSchema, required: false },
		audio: { type: AudioRenderSettingsSchema, required: false },
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
	frictionlessThreshold: {
		type: Number,
		default: frictionlessThresholdDefault,
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
	puzzle: { type: PuzzleRenderSettingsSchema, required: false },
	audio: { type: AudioRenderSettingsSchema, required: false },
	audioAccessibilityEnabled: {
		type: Boolean,
		default: false,
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
			default: {
				[ContextType.Default]: {
					type: ContextType.Default,
					threshold: contextAwareThresholdDefault,
				},
				[ContextType.Webview]: {
					type: ContextType.Webview,
					threshold: contextAwareThresholdDefault,
				},
			},
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
				frictionlessThreshold: Number,
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
