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

// Sources excluded from the visitorId hash. `webGlExtensions` walks every
// supported WebGL extension and shader-precision combination, which can take
// 1.5–2s on real GPUs and gates everything downstream of `getFingerprint()`
// (account derivation → frictionless POST). The high-entropy part of WebGL
// fingerprinting (vendor/UNMASKED_RENDERER) is in `webGlBasics`, which stays.
const EXCLUDED_SOURCES = ["webGlExtensions"] as const;

const FingerprintJSImport = async () => import("@prosopo/fingerprintjs");

let fingerprintCache: Promise<string> | null = null;

export const getFingerprint = async (): Promise<string> => {
	if (!fingerprintCache) {
		fingerprintCache = (async () => {
			const { sources, loadSources, hashComponents, prepareForSources } =
				await FingerprintJSImport();
			await prepareForSources();
			// The sourceOptions object must structurally contain every property
			// any source might read (some sources use `cache`, `domBlockers`
			// uses `debug`, etc.). Mirrors fpjs's internal `BuiltinSourceOptions`
			// — which isn't exported, so we declare the shape inline.
			const sourceOptions: { cache: Record<string, unknown>; debug?: boolean } = {
				cache: {},
			};
			const getComponents = loadSources(sources, sourceOptions, EXCLUDED_SOURCES);
			const components = await getComponents();
			return hashComponents(components);
		})();
	}
	return fingerprintCache;
};

/**
 * Pre-warms the fingerprint cache so getFingerprint() resolves immediately when called later.
 * Errors are silently ignored — getFingerprint() will retry on its next call.
 */
export const prefetchFingerprint = (): void => {
	getFingerprint().catch(() => {
		fingerprintCache = null;
	});
};
