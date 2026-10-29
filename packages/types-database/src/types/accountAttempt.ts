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

import { Schema } from "mongoose";

/**
 * One captcha attempt by a user account, kept in the central DB for a few
 * minutes so any provider can see an account's recent history at verify time.
 *
 * Each provider only reads its own local DB, and DNS routing sends a caller
 * that changes IP to a different provider, so an account that fails on one
 * node and retries from a new exit is invisible to the next node without a
 * shared log. One document per challenge: the submit and verify updates of
 * the same attempt overwrite it rather than adding a second.
 */
export type AccountAttemptRecord = {
	challenge: string;
	account: string;
	dappAccount: string;
	captchaType: string;
	at: Date;
	passed: boolean;
	ip?: string;
	asn?: number;
};

export const ACCOUNT_ATTEMPT_TTL_SECONDS = 15 * 60;

export const AccountAttemptRecordSchema = new Schema<AccountAttemptRecord>({
	challenge: { type: String, required: true },
	account: { type: String, required: true },
	dappAccount: { type: String, required: true },
	captchaType: { type: String, required: true },
	at: { type: Date, required: true },
	passed: { type: Boolean, required: true },
	ip: { type: String, required: false },
	asn: { type: Number, required: false },
});
AccountAttemptRecordSchema.index(
	{ at: 1 },
	{ expireAfterSeconds: ACCOUNT_ATTEMPT_TTL_SECONDS },
);
AccountAttemptRecordSchema.index({ account: 1, at: -1 });
AccountAttemptRecordSchema.index({ challenge: 1 }, { unique: true });
