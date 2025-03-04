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

import { z } from "zod";
import type { Timestamp } from "../datasets/index.js";

import type { IUserSettings } from "./settings.js";

export enum Tier {
	Free = "free",
	Professional = "professional",
	Enterprise = "enterprise",
}

export const TierSchema = z.nativeEnum(Tier);

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
	tier: Tier;
	tierRequestQuota: number; // how many requests the user is entitled to in this tier (note this may vary for the same tier, e.g. pro @ 100k, pro @ 200k, etc)
	marketingPreferences: boolean;
	originUrl: string;
	settings?: IUserSettings;
	updatedAtTimestamp?: Timestamp;
}
