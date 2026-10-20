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

import { hexHash } from "@prosopo/util-crypto";
import {
	type FingerprintProof,
	verifyFingerprintProofStructure,
} from "./proof.js";

/**
 * The disclosed keys a device cannot change between sessions. They are fixed by
 * the installation and the host, so a hash over them names a population cohort
 * that survives a client redrawing the rest of its identity.
 *
 * Deliberately excludes `colorDepth` and `hardwareConcurrency`: those two are
 * the ones an anti-detect build redraws per launch, and they are kept separate
 * below so a reader can see the pair move underneath one stable group.
 */
const GROUP_KEYS = [
	"cookiesEnabled",
	"sessionStorage",
	"localStorage",
	"timezone",
	"languages",
	"architecture",
] as const;

/**
 * What is worth keeping from a proof once it has been checked.
 *
 * The proof itself is not persisted — each disclosure carries a full Merkle
 * path, which is large and of no use after verification. This is the part a
 * sightings aggregation needs:
 *
 *   root      the commitment to the whole component set. Both this and the
 *             account address are functions of that one set, so they are 1:1 by
 *             construction — a root arriving with a second address, or an
 *             address with a second root, cannot happen honestly.
 *   groupHash the install-stable cohort (see GROUP_KEYS).
 *   colorDepth / hardwareConcurrency
 *             the two disclosed values that move. A real device reports one
 *             pair, forever; one group carrying several pairs is several
 *             machines or one client redrawing its identity.
 */
export interface FingerprintSummary {
	root: string;
	groupHash: string;
	/**
	 * The disclosed `deviceBucket` digest, carried through only because its
	 * disclosure hashed to `root` — so it cannot be presented independently of
	 * the identity the same commitment produced. Absent for a client that did
	 * not disclose it.
	 */
	bucketId?: string;
	colorDepth?: number;
	hardwareConcurrency?: number;
	disclosed?: FingerprintDisclosedValues;
}

/**
 * The install-stable disclosed values, kept individually alongside the hash of
 * them.
 *
 * `groupHash` alone is enough to bucket by, but it is one-way: a cohort could be
 * counted and never described, so "which timezone is this concentrated in?"
 * would be unanswerable after the fact. Keeping the values costs about 170 bytes
 * a record against a stored proof's ~7.8KB, and the hash stays precomputed so it
 * can carry an index.
 *
 * `languages` is a nested array in the component set and is stored as canonical
 * JSON, so it is one indexable scalar rather than an array path.
 */
export interface FingerprintDisclosedValues {
	timezone?: string;
	languages?: string;
	architecture?: number;
	cookiesEnabled?: boolean;
	sessionStorage?: boolean;
	localStorage?: boolean;
}

const asNumber = (value: unknown): number | undefined =>
	typeof value === "number" && Number.isFinite(value) ? value : undefined;

/**
 * Reduce an encoded proof to the fields worth storing, or `undefined` when it
 * is absent, unparseable, or fails structural verification.
 *
 * Structural verification is not optional here: an unverified disclosure is a
 * client-asserted value with a decorative Merkle path beside it, and storing
 * one would put a forgeable field into an aggregation that reads as
 * tamper-evident. Value *bounding* is a separate concern and stays in the
 * routing machine's validator — this only refuses what does not hash together.
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

	const bucket = byKey.get("deviceBucket");

	return {
		root: proof.root,
		groupHash: hexHash(groupInput),
		...(typeof bucket === "string" && bucket !== "" && { bucketId: bucket }),
		...(asNumber(byKey.get("colorDepth")) !== undefined && {
			colorDepth: asNumber(byKey.get("colorDepth")),
		}),
		...(asNumber(byKey.get("hardwareConcurrency")) !== undefined && {
			hardwareConcurrency: asNumber(byKey.get("hardwareConcurrency")),
		}),
		...(Object.keys(disclosed).length > 0 && { disclosed }),
	};
};
