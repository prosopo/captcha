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

export type DetectorType = typeof import("@prosopo/detector").default;

/** Loads the detector bundled into the widget (legacy / fallback path). */
export const DetectorLoader = async (): Promise<DetectorType> =>
	(await import("@prosopo/detector")).default;

/**
 * Loads a detector from a provider-served obfuscated ESM string (the per-session
 * pool bundle). Evaluated via a blob URL — the served module is self-contained
 * (no imports), so dynamic `import()` of the blob yields its default export.
 */
export const DetectorLoaderFromScript = async (
	script: string,
): Promise<DetectorType> => {
	const blob = new Blob([script], { type: "text/javascript" });
	const url = URL.createObjectURL(blob);
	try {
		const mod = (await import(/* @vite-ignore */ url)) as {
			default: DetectorType;
		};
		return mod.default;
	} finally {
		URL.revokeObjectURL(url);
	}
};
