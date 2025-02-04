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
import type { Timestamp } from "../datasets/index.js";

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
	tier: Tier;
	tierRequestQuota: number; // how many requests the user is entitled to in this tier (note this may vary for the same tier, e.g. pro @ 100k, pro @ 200k, etc)
	marketingPreferences: boolean;
	originUrl: string;
	settings?: IUserSettings;
	updatedAtTimestamp?: Timestamp;
	tierCheckoutId?: string; // prosopo (not stripe!) checkout session id / lock
	stripeCustomerId?: string; // stripe customer id
	stripeTierCheckoutId?: string; // stripe checkout session id
	stripeTierSubscriptionId?: string; // stripe subscription id
	stripeTierPriceId?: string; // stripe price id for the subscription
	stripeTierNext?: string; // the next tier the user is moving to, if any
	stripeTierNextAt?: number; // the time the user will move to the next tier, if any
	stripeTierCancelAt?: number; // the time the user's subscription will be cancelled (e.g. if cancelling at end of billing period)
	stripeUpdatedAt?: number; // the time the user's stripe details were last updated (needed for webhook ordering)
	pendingCheckoutTier?: Tier; // the pending checkout tier, if any
	pendingCheckoutTierRequestQuota?: number; // the pending checkout tier request quota, if any
}

export interface IUserSettings {
	frictionlessThreshold?: number;
	powDifficulty: number;
	domains: string[];
	captchaType: "pow" | "image" | "frictionless"; // don't let me get this into staging
}
