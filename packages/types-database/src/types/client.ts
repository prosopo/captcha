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

import type { Timestamp } from "@prosopo/types";
import type mongoose from "mongoose";
import { Schema } from "mongoose";

export enum Tier {
	Free = "free",
	Professional = "professional",
	Enterprise = "enterprise",
}

export const TierMonthlyLimits = {
	[Tier.Free]: {
		verificationRequests: 100000,
	},
	[Tier.Professional]: {
		verificationRequests: 1000000,
	},
	[Tier.Enterprise]: {
		verificationRequests: "Unlimited",
	},
};

export interface IUserData {
	email: string;
	name: string;
	account: string;
	url: string;
	mnemonic: string;
	createdAt: Timestamp;
	activated: boolean;
	tier?: Tier;
	settings?: IUserSettings;
	updatedAtTimestamp: Timestamp;
}

export interface IUserSettings {
	botThreshold: number;
	domains: string[];
}

export type UserDataRecord = mongoose.Document & IUserData;

export const UserSettingsSchema = new Schema({
	botThreshold: Number,
	domains: [String],
});

export const UserDataSchema: mongoose.Schema<UserDataRecord> = new Schema({
	email: String,
	name: String,
	account: String,
	url: String,
	mnemonic: String,
	createdAt: Number,
	activated: Boolean,
	tier: String,
	settings: {
		type: UserSettingsSchema,
		required: false,
	},
	updatedAtTimestamp: Number,
});

export enum TableNames {
	emails = "emails",
}

import type { IDatabase } from "./mongo.js";
import type { ClientRecord, Tables } from "./provider.js";

export interface IClientDatabase extends IDatabase {
	getTables(): Tables<TableNames>;
	getUpdatedClients(updatedAtTimestamp: Timestamp): Promise<ClientRecord[]>;
}
