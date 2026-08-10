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

export const getFingerprint = async (): Promise<string> => {
	const [{ hashComponents }, components] = await Promise.all([
		FingerprintJSImport(),
		loadComponents(),
	]);
	return hashComponents(components);
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
