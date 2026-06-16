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

import type { Component, UnknownComponents } from "@prosopo/fingerprintjs";
import type { MerkleProof } from "@prosopo/types";
import { hexHash } from "@prosopo/util-crypto";
import {
	buildMerkleLayers,
	merkleProofFromLayers,
	merkleRootFromLayers,
	verifyMerkleProof,
} from "./merkle.js";

export const FINGERPRINT_PROOF_VERSION = 1;

/**
 * A single disclosed fingerprint component: its raw value (or an error flag)
 * together with the Merkle proof that it belongs to the committed root. The
 * value is left as `unknown` because each FingerprintJS source produces a
 * different shape (string / number / boolean / array / object); the proof
 * validator is responsible for bounding it.
 */
export interface FingerprintLeafDisclosure {
	key: string;
	value?: unknown;
	error?: boolean;
	proof: MerkleProof;
}

/**
 * A proof of fingerprint: a commitment (`root`) to the whole, deterministically
 * ordered set of FingerprintJS components, plus a selective disclosure of some
 * of those components. It lets a verifier check that the disclosed values were
 * part of one coherent, genuinely-constructed fingerprint without the client
 * being able to mix-and-match values across requests.
 */
export interface FingerprintProof {
	v: number;
	root: string;
	disclosures: FingerprintLeafDisclosure[];
}

// Escape a component key exactly as FingerprintJS does in its canonical string,
// so a leaf can never be forged by shifting a `:`/`|` between key and value.
const escapeKey = (key: string): string => key.replace(/([:|\\])/g, "\\$1");

// Canonical per-component leaf content. Mirrors one segment of FingerprintJS'
// `componentsToCanonicalString`, so the leaf commits to exactly the value the
// visitorId hash is derived from.
const componentLeafContent = (
	key: string,
	component: Component<unknown>,
): string => {
	const serialized =
		"error" in component ? "error" : JSON.stringify(component.value);
	return `${escapeKey(key)}:${serialized}`;
};

const disclosureLeafContent = (disclosure: FingerprintLeafDisclosure): string => {
	const serialized = disclosure.error
		? "error"
		: JSON.stringify(disclosure.value);
	return `${escapeKey(disclosure.key)}:${serialized}`;
};

export const leafHashForContent = (content: string): string => hexHash(content);

/**
 * Build a {@link FingerprintProof} from an already-resolved FingerprintJS
 * components map. The commitment always covers every component (in sorted key
 * order); `discloseKeys` selects which components are revealed (defaulting to
 * all). Keys that are not present in the fingerprint are skipped — a validator
 * should treat an expected-but-absent disclosure as a failure.
 */
export const buildFingerprintProofFromComponents = (
	components: UnknownComponents,
	discloseKeys?: string[],
): FingerprintProof => {
	const keys = Object.keys(components).sort();
	if (keys.length === 0) {
		throw new Error("fingerprint proof: no components to commit to");
	}

	const leafHashes = keys.map((key) => {
		const component = components[key];
		if (component === undefined) {
			throw new Error(`fingerprint proof: missing component ${key}`);
		}
		return leafHashForContent(componentLeafContent(key, component));
	});

	const layers = buildMerkleLayers(leafHashes);
	const root = merkleRootFromLayers(layers);

	const disclose = discloseKeys ?? keys;
	const disclosures: FingerprintLeafDisclosure[] = [];
	for (const key of disclose) {
		const index = keys.indexOf(key);
		if (index === -1) {
			continue;
		}
		const component = components[key];
		const leafHash = leafHashes[index];
		if (component === undefined || leafHash === undefined) {
			continue;
		}
		const proof = merkleProofFromLayers(layers, leafHash);
		disclosures.push(
			"error" in component
				? { key, error: true, proof }
				: { key, value: component.value, proof },
		);
	}

	return { v: FINGERPRINT_PROOF_VERSION, root, disclosures };
};

/**
 * Structural verification of a proof: every disclosed `(key, value)` re-hashes
 * to a leaf that is proven to belong to the single committed `root`. This is
 * the non-secret half of validation — the value-bounding rules live in the
 * provider-side (closed-source) validator and are layered on top of this.
 */
export const verifyFingerprintProofStructure = (
	proof: FingerprintProof,
): boolean => {
	if (proof.v !== FINGERPRINT_PROOF_VERSION) {
		return false;
	}
	if (typeof proof.root !== "string" || proof.disclosures.length === 0) {
		return false;
	}
	for (const disclosure of proof.disclosures) {
		const leafHash = leafHashForContent(disclosureLeafContent(disclosure));
		if (!verifyMerkleProof(leafHash, disclosure.proof)) {
			return false;
		}
		const rootLayer = disclosure.proof[disclosure.proof.length - 1];
		if (rootLayer === undefined || rootLayer[0] !== proof.root) {
			return false;
		}
	}
	return true;
};

export const encodeFingerprintProof = (proof: FingerprintProof): string =>
	JSON.stringify(proof);
