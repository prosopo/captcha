// Copyright 2021-2025 Prosopo (UK) Ltd.
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

import type { IUserData, IUserSettings, Timestamp } from "@prosopo/types";
import type mongoose from "mongoose";
import { Schema } from "mongoose";
import type { IDatabase } from "./mongo.js";
import type { ClientRecord, Tables } from "./provider.js";

export type UserDataRecord = mongoose.Document & IUserData;

export const UserSettingsSchema = new Schema({
	captchaType: String,
	frictionlessThreshold: Number,
	powDifficulty: Number,
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
