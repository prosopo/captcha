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

// webGlExtensions walks every supported WebGL extension + shader-precision
// combination, costing 1.5-2s on real GPUs. Dropped from the visitorId hash;
// webGlBasics still covers vendor/UNMASKED_RENDERER.
const EXCLUDED_SOURCES = ["webGlExtensions"] as const;

const FingerprintJSImport = async () => import("@prosopo/fingerprintjs");

let fingerprintCache: Promise<string> | null = null;

export const getFingerprint = async (): Promise<string> => {
	if (!fingerprintCache) {
		fingerprintCache = (async () => {
			const { sources, loadSources, hashComponents, prepareForSources } =
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
			const components = await getComponents();
			return hashComponents(components);
		})();
	}
	return fingerprintCache;
};

export const prefetchFingerprint = (): void => {
	getFingerprint().catch(() => {
		fingerprintCache = null;
	});
};
