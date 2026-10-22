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

import type { UnknownComponents } from "@prosopo/fingerprintjs";
import {
	type FingerprintProof,
	buildFingerprintProofFromComponents,
} from "./proof.js";

// webGlExtensions walks every supported WebGL extension + shader-precision
// combination, costing 1.5-2s on real GPUs. Dropped from the visitorId hash;
// webGlBasics still covers vendor/UNMASKED_RENDERER.
const EXCLUDED_SOURCES = ["webGlExtensions"] as const;

const FingerprintJSImport = async () => import("@prosopo/fingerprintjs");

// Cache the resolved components (the expensive part) rather than just the hash,
// so the visitorId and the proof are derived from one identical run.
let componentsCache: Promise<UnknownComponents> | null = null;

const loadComponents = (): Promise<UnknownComponents> => {
	if (!componentsCache) {
		const pending = (async () => {
			const { sources, loadSources, prepareForSources } =
				await FingerprintJSImport();
			await prepareForSources();
			// Structural supertype of every per-source Options shape — fpjs's
			// `BuiltinSourceOptions` isn't exported.
			const sourceOptions: { cache: Record<string, unknown>; debug?: boolean } =
				{
					cache: {},
				};
			const getComponents = loadSources(
				sources,
				sourceOptions,
				EXCLUDED_SOURCES,
			);
			return getComponents();
		})();
		componentsCache = pending;
		// Don't cache a rejected run — let the next caller retry.
		pending.catch(() => {
			if (componentsCache === pending) {
				componentsCache = null;
			}
		});
	}
	return componentsCache;
};

/**
 * Components the visitorId must not be derived from.
 *
 * `deviceBucket` digests components the run already produces, so folding it
 * into the visitorId would add no entropy while changing every existing
 * visitorId. The account address is a pure function of the visitorId, so every
 * account on record would rotate and its sighting history would be orphaned.
 * The proof still commits to it, and it is disclosed, which is the point of
 * collecting it.
 */
const NON_IDENTITY_SOURCES: readonly string[] = ["deviceBucket"];

/** Exported so the stability of the visitorId can be asserted directly. */
export const forIdentity = (components: UnknownComponents): UnknownComponents =>
	Object.fromEntries(
		Object.entries(components).filter(
			([key]) => !NON_IDENTITY_SOURCES.includes(key),
		),
	);

export const getFingerprint = async (): Promise<string> => {
	const [{ hashComponents }, components] = await Promise.all([
		FingerprintJSImport(),
		loadComponents(),
	]);
	return hashComponents(forIdentity(components));
};

/**
 * Produce a proof of fingerprint: a Merkle commitment to the full component set
 * plus a selective disclosure of the requested components. Callers should pass
 * {@link FINGERPRINT_DISCLOSURE_KEYS} — omitting `discloseKeys` discloses every
 * component, which produces a very large payload. Derived from the same
 * component run as {@link getFingerprint}.
 */
export const getFingerprintProof = async (
	discloseKeys?: readonly string[],
): Promise<FingerprintProof> => {
	const components = await loadComponents();
	return buildFingerprintProofFromComponents(components, discloseKeys);
};

export const prefetchFingerprint = (): void => {
	loadComponents().catch(() => {
		/* swallow — loadComponents already clears its own failed cache */
	});
};

export type { FingerprintLeafDisclosure, FingerprintProof } from "./proof.js";
export {
	FINGERPRINT_DISCLOSURE_KEYS,
	FINGERPRINT_PROOF_VERSION,
	buildFingerprintProofFromComponents,
	encodeFingerprintProof,
	leafHashForContent,
	verifyFingerprintProofStructure,
} from "./proof.js";
export {
	buildMerkleLayers,
	hashMerklePair,
	merkleProofFromLayers,
	merkleRootFromLayers,
	verifyMerkleProof,
} from "./merkle.js";
export type { FingerprintSummary } from "./summary.js";
export { summariseFingerprintProof } from "./summary.js";
