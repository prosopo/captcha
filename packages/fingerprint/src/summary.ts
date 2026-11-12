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
	FingerprintDisclosedValuesStored,
	FingerprintSummaryStored,
} from "@prosopo/types";
import { hexHash } from "@prosopo/util-crypto";
import {
	type FingerprintProof,
	verifyFingerprintProofStructure,
} from "./proof.js";

/**
 * The disclosed keys that are fixed by the installation and the host. A hash
 * over them names a cohort of devices.
 *
 * `colorDepth` and `hardwareConcurrency` are disclosed too but kept out of the
 * hash and stored beside it, so that the values can be read per cohort rather
 * than only folded into it.
 */
const GROUP_KEYS = [
	"cookiesEnabled",
	"sessionStorage",
	"localStorage",
	"timezone",
	"languages",
	"architecture",
] as const;

export type FingerprintSummary = FingerprintSummaryStored;
export type FingerprintDisclosedValues = FingerprintDisclosedValuesStored;

const asNumber = (value: unknown): number | undefined =>
	typeof value === "number" && Number.isFinite(value) ? value : undefined;

/**
 * Reduce an encoded proof to the fields worth storing, or `undefined` when it
 * is absent, unparseable, or fails structural verification.
 *
 * Structural verification is not optional here: an unverified disclosure is a
 * client-asserted value with a decorative Merkle path beside it, and storing
 * one would put a forgeable field into an aggregation that reads as
 * tamper-evident. Whether the values are *plausible* is a separate concern and
 * stays in the routing machine's validator; this only refuses what does not
 * hash together.
 */
export const summariseFingerprintProof = (
	encoded: string | undefined,
): FingerprintSummary | undefined => {
	if (!encoded) return undefined;

	let proof: FingerprintProof;
	try {
		proof = JSON.parse(encoded) as FingerprintProof;
	} catch {
		return undefined;
	}

	if (
		typeof proof !== "object" ||
		proof === null ||
		typeof proof.root !== "string" ||
		!Array.isArray(proof.disclosures)
	) {
		return undefined;
	}

	if (!verifyFingerprintProofStructure(proof)) return undefined;

	const byKey = new Map<string, unknown>();
	for (const disclosure of proof.disclosures) {
		// An errored disclosure has no value to commit to; leaving it out of the
		// group input keeps "the source threw" distinct from "it reported null".
		if (!disclosure.error) byKey.set(disclosure.key, disclosure.value);
	}

	// Canonical JSON over a fixed key order, so the same device hashes the same
	// way whatever order the disclosures arrived in.
	const groupInput = GROUP_KEYS.map(
		(key) => `${key}:${JSON.stringify(byKey.get(key) ?? null)}`,
	).join("|");

	const disclosed: FingerprintDisclosedValues = {};
	const timezone = byKey.get("timezone");
	if (typeof timezone === "string") disclosed.timezone = timezone;
	const languages = byKey.get("languages");
	if (languages !== undefined) disclosed.languages = JSON.stringify(languages);
	const architecture = asNumber(byKey.get("architecture"));
	if (architecture !== undefined) disclosed.architecture = architecture;
	for (const key of [
		"cookiesEnabled",
		"sessionStorage",
		"localStorage",
	] as const) {
		const value = byKey.get(key);
		if (typeof value === "boolean") disclosed[key] = value;
	}

	const bucketId = byKey.get("deviceBucket");
	const colorDepth = asNumber(byKey.get("colorDepth"));
	const hardwareConcurrency = asNumber(byKey.get("hardwareConcurrency"));

	return {
		root: proof.root,
		groupHash: hexHash(groupInput),
		...(typeof bucketId === "string" && bucketId !== "" && { bucketId }),
		...(colorDepth !== undefined && { colorDepth }),
		...(hardwareConcurrency !== undefined && { hardwareConcurrency }),
		...(Object.keys(disclosed).length > 0 && { disclosed }),
	};
};
