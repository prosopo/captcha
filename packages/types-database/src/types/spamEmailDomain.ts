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

import type mongoose from "mongoose";
import { Schema } from "mongoose";

export type SpamEmailDomain = {
	domain: string;
	/** The blocklist URLs that carried the domain on the last sync. */
	sources?: string[];
	firstSeenAt?: Date;
	/** When no blocklist carried the domain any more; cleared if one does again. */
	missingSince?: Date;
	/** Added by hand: the sync never changes or expires it. */
	manual?: boolean;
	/** Our own allowlist entry: never flagged, and removes any blocklist entry. */
	allow?: boolean;
};

/** `block` flags the domain and never expires; `allow` never flags it. */
export type HandAddedSpamEmailDomainKind = "block" | "allow";

export type SpamEmailDomainRecord = mongoose.Document & SpamEmailDomain;

export type StoredSpamEmailDomain = Omit<SpamEmailDomain, "firstSeenAt"> & {
	firstSeenAt: Date;
};

export type SpamEmailDomainUpdate = {
	domain: string;
	sources: string[];
	firstSeenAt: Date;
	missingSince: Date | null;
};

export type SpamEmailDomainChanges = {
	inserts: SpamEmailDomainUpdate[];
	updates: SpamEmailDomainUpdate[];
	deletes: string[];
};

export const SpamEmailDomainRecordSchema = new Schema<SpamEmailDomainRecord>({
	// `unique` already creates the ascending index on `domain`; declaring it
	// again with `.index()` made mongoose warn about a duplicate on every
	// process start.
	domain: { type: String, required: true, unique: true },
	sources: { type: [String], default: undefined },
	firstSeenAt: { type: Date },
	missingSince: { type: Date },
	manual: { type: Boolean },
	allow: { type: Boolean },
});
