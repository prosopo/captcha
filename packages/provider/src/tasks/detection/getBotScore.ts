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

import type { DetectorResult } from "@prosopo/types";
import getBotScoreFromPayload from "./decodePayload.js";

// Mongo rejects field names containing "." or starting with "$", and the map
// is unbounded client-controlled data that is now persisted on the session
// record — an oversized or malformed key would fail the insert and 400 the
// request. Entries that can't be stored are dropped rather than rejecting the
// whole payload.
const MAX_SIGNAL_KEYS = 64;
const MAX_SIGNAL_KEY_LENGTH = 64;
const MAX_SIGNAL_VALUES = 64;
const MAX_SIGNAL_VALUE_LENGTH = 256;

const isStringArray = (values: unknown): values is string[] =>
	Array.isArray(values) &&
	values.every(
		(entry: unknown): entry is string =>
			typeof entry === "string" && entry.length <= MAX_SIGNAL_VALUE_LENGTH,
	);

export const sanitiseSignalMap = (
	value: unknown,
): Record<string, string[]> | undefined => {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return undefined;
	}

	const sanitised: Record<string, string[]> = {};
	let kept = 0;
	for (const [key, values] of Object.entries(
		value as Record<string, unknown>,
	)) {
		if (kept >= MAX_SIGNAL_KEYS) break;
		if (
			key.length === 0 ||
			key.length > MAX_SIGNAL_KEY_LENGTH ||
			key.includes(".") ||
			key.startsWith("$") ||
			key.includes("\u0000")
		) {
			continue;
		}
		if (!isStringArray(values)) continue;
		sanitised[key] = values.slice(0, MAX_SIGNAL_VALUES);
		kept += 1;
	}

	return Object.keys(sanitised).length > 0 ? sanitised : undefined;
};

export const getBotScore = async (
	payload: string,
	headHash: string,
	privateKeyString?: string,
	innerConfigEncoded?: string,
) => {
	const result = (await getBotScoreFromPayload(
		payload,
		headHash,
		privateKeyString,
		innerConfigEncoded,
	)) as DetectorResult;
	const baseBotScore: number = result.score;
	const timestamp: number = result.timestamp;
	const userId: string = result.userId;
	const userAgent: string = result.userAgent;
	const isWebView: boolean = result.isWebView ?? false;
	const isIframe: boolean = result.isIframe ?? false;
	const decryptedHeadHash: string = result.decryptedHeadHash;
	const triggeredDetectors: number[] | undefined = result.triggeredDetectors;
	const shadowDomPenalty: boolean | undefined = result.shadowDomPenalty;
	const entropyMathRandomFingerprint: string | undefined =
		result.entropyMathRandomFingerprint;
	const entropyCryptoFingerprint: string | undefined =
		result.entropyCryptoFingerprint;
	const entropyWallClockOffsetMs: number | undefined =
		result.entropyWallClockOffsetMs;
	const entropyMathRandomFirst: number | undefined =
		result.entropyMathRandomFirst;
	const g: string | undefined = result.g;
	const i: boolean | undefined = result.i;
	const cv: number | undefined = result.cv;
	const sq: number | undefined = result.sq;
	const cg: string | undefined = result.cg;
	const sm: string | undefined = result.sm;
	const sw: boolean | undefined = result.sw;
	const md: boolean | undefined = result.md;
	const bn: boolean | undefined = result.bn;
	const fs: boolean | undefined = result.fs;
	const b: Record<string, string[]> | undefined = sanitiseSignalMap(result.b);

	if (baseBotScore === undefined || Number.isNaN(baseBotScore)) {
		return {
			baseBotScore: 1,
			timestamp: 0,
		};
	}

	return {
		baseBotScore,
		timestamp,
		userId,
		userAgent,
		isWebView,
		isIframe,
		decryptedHeadHash,
		triggeredDetectors,
		shadowDomPenalty,
		entropyMathRandomFingerprint,
		entropyCryptoFingerprint,
		entropyWallClockOffsetMs,
		entropyMathRandomFirst,
		g,
		i,
		cv,
		sq,
		cg,
		sm,
		sw,
		md,
		bn,
		fs,
		b,
	};
};
