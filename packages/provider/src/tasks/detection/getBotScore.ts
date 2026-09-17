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

import type {
	DetectorData,
	DetectorDataValue,
	DetectorResult,
} from "@prosopo/types";
import getBotScoreFromPayload from "./decodePayload.js";

// Mongo rejects field names containing "." or starting with "$", and the bag
// is unbounded client-controlled data that is persisted on the session record
// — an oversized or malformed key would fail the insert and 400 the request.
// Entries that can't be stored are dropped rather than rejecting the whole
// payload.
const MAX_KEYS = 64;
const MAX_KEY_LENGTH = 64;
const MAX_ARRAY_LENGTH = 64;
const MAX_STRING_LENGTH = 512;
// How deep objects and arrays may nest. A scalar sitting at the bottom of a
// chain this long is still kept; it is containers below the limit that are
// dropped, since those are what make the walk unbounded.
const MAX_DEPTH = 4;
// Ceiling on the work one sanitisation pass may do, so a deeply-branching bag
// cannot burn the hot path. Set to MAX_KEYS * MAX_ARRAY_LENGTH: any lower and
// it would silently bite before the per-collection caps above, making those
// caps a fiction — which is exactly what it did when first written.
const MAX_NODES = MAX_KEYS * MAX_ARRAY_LENGTH;
const MAX_SERIALISED_LENGTH = 8192;

const isStorableKey = (key: string): boolean =>
	key.length > 0 &&
	key.length <= MAX_KEY_LENGTH &&
	!key.includes(".") &&
	!key.startsWith("$") &&
	!key.includes("\u0000");

/**
 * Shared across one sanitisation pass so a bag that is shallow and wide costs
 * the same budget as one that is deep and narrow.
 */
type NodeBudget = { remaining: number };

const sanitiseObject = (
	value: Record<string, unknown>,
	depth: number,
	budget: NodeBudget,
): Record<string, DetectorDataValue> => {
	const sanitised: Record<string, DetectorDataValue> = {};
	let kept = 0;
	for (const [key, entry] of Object.entries(value)) {
		if (kept >= MAX_KEYS) break;
		if (!isStorableKey(key)) continue;
		const sanitisedEntry = sanitiseValue(entry, depth + 1, budget);
		if (sanitisedEntry === undefined) continue;
		sanitised[key] = sanitisedEntry;
		kept += 1;
	}
	return sanitised;
};

const sanitiseValue = (
	value: unknown,
	depth: number,
	budget: NodeBudget,
): DetectorDataValue | undefined => {
	if (budget.remaining <= 0) return undefined;
	budget.remaining -= 1;

	if (value === null) return null;

	switch (typeof value) {
		case "boolean":
			return value;
		case "number":
			// NaN and the infinities survive neither JSON nor a useful
			// comparison in a rule, so they are dropped rather than stored.
			return Number.isFinite(value) ? value : undefined;
		case "string":
			return value.length <= MAX_STRING_LENGTH
				? value
				: value.slice(0, MAX_STRING_LENGTH);
		case "object":
			break;
		default:
			return undefined;
	}

	if (depth >= MAX_DEPTH) return undefined;

	if (Array.isArray(value)) {
		const sanitised: DetectorDataValue[] = [];
		for (const entry of value.slice(0, MAX_ARRAY_LENGTH)) {
			const sanitisedEntry = sanitiseValue(entry, depth + 1, budget);
			if (sanitisedEntry !== undefined) sanitised.push(sanitisedEntry);
		}
		return sanitised;
	}

	return sanitiseObject(value as Record<string, unknown>, depth, budget);
};

/**
 * Make a detector's reported signals safe to persist and to hand to a rule.
 *
 * A bag that is still oversized once the per-node caps have been applied is
 * dropped whole rather than stored partially: a rule reading a silently
 * trimmed bag would draw conclusions from an absence the client never
 * intended. A client that wants a signal unseen can simply not send it, so
 * this costs nothing that was not already available to it.
 */
export const sanitiseDetectorData = (
	value: unknown,
): DetectorData | undefined => {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return undefined;
	}

	const sanitised = sanitiseObject(value as Record<string, unknown>, 0, {
		remaining: MAX_NODES,
	});

	if (Object.keys(sanitised).length === 0) return undefined;
	if (JSON.stringify(sanitised).length > MAX_SERIALISED_LENGTH) {
		return undefined;
	}
	return sanitised;
};

/**
 * What one decode attempt yields. Shaped so both the success and the
 * unreadable-payload paths return the same keys — the caller loops over
 * candidate keys and should not have to narrow a union to find out whether a
 * given attempt worked.
 */
export type DecodedDetectorPayload = {
	baseBotScore: number;
	timestamp: number;
	userId?: string;
	userAgent?: string;
	isWebView: boolean;
	isIframe: boolean;
	decryptedHeadHash: string;
	triggeredDetectors?: number[];
	shadowDomPenalty?: boolean;
	d?: DetectorData;
};

export const getBotScore = async (
	payload: string,
	headHash: string,
	privateKeyString?: string,
	innerConfigEncoded?: string,
	payloadLayoutEncoded?: string,
	keyMapEncoded?: string,
): Promise<DecodedDetectorPayload> => {
	const result = (await getBotScoreFromPayload(
		payload,
		headHash,
		privateKeyString,
		innerConfigEncoded,
		payloadLayoutEncoded,
		keyMapEncoded,
	)) as DetectorResult;

	const baseBotScore: number = result.score;

	if (baseBotScore === undefined || Number.isNaN(baseBotScore)) {
		return {
			baseBotScore: 1,
			timestamp: 0,
			isWebView: false,
			isIframe: false,
			decryptedHeadHash: "",
		};
	}

	return {
		baseBotScore,
		timestamp: result.timestamp,
		userId: result.userId,
		userAgent: result.userAgent,
		isWebView: result.isWebView ?? false,
		isIframe: result.isIframe ?? false,
		decryptedHeadHash: result.decryptedHeadHash,
		triggeredDetectors: result.triggeredDetectors,
		shadowDomPenalty: result.shadowDomPenalty,
		d: sanitiseDetectorData(result.d),
	};
};
