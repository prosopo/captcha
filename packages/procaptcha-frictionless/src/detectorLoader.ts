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
	Account,
	BehavioralData,
	ClickEventPoint,
	EnvironmentTypes,
	MouseMovementPoint,
	PackedBehavioralData,
	RandomProvider,
	TouchEventPoint,
} from "@prosopo/types";

// The detector is NOT bundled into the widget — it lives only in the
// provider-served pool bundles, loaded at runtime via a blob URL below. So the
// signature is declared locally here (mirroring `@prosopo/detector`'s default
// export) from shared @prosopo/types primitives, rather than importing the
// detector package as a build-time type dependency.
type RandomProviderSelectorFn = (
	env: EnvironmentTypes,
) => Promise<RandomProvider>;

export type DetectorType = (
	env: EnvironmentTypes,
	randomProviderSelectorFn: RandomProviderSelectorFn,
	container: HTMLElement | undefined,
	restart: () => void,
	accountGenerator: () => Promise<Account>,
) => Promise<{
	token: string;
	shadowDomCleanup: () => void;
	encryptHeadHash: string;
	mouseTracker?: {
		start: () => void;
		stop: () => void;
		getData: () => MouseMovementPoint[];
		clear: () => void;
	};
	touchTracker?: {
		start: () => void;
		stop: () => void;
		getData: () => TouchEventPoint[];
		clear: () => void;
	};
	clickTracker?: {
		start: () => void;
		stop: () => void;
		getData: () => ClickEventPoint[];
		clear: () => void;
	};
	hasTouchSupport?: string;
	encryptBehavioralData?: (data: string) => Promise<string>;
	packBehavioralData?: (behavioralData: BehavioralData) => PackedBehavioralData;
	getSimdReadings?: (timeoutMs?: number) => Promise<string | undefined>;
	userAccount: Account;
}>;

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
		// DEBUG(detector-pool): remove.
		console.log(
			`[POOL-DEBUG] blob import of provider-served detector (${url})`,
		);
		const mod = (await import(/* @vite-ignore */ url)) as {
			default: DetectorType;
		};
		// DEBUG(detector-pool): remove.
		console.log("[POOL-DEBUG] blob import OK — provider detector evaluated");
		return mod.default;
	} finally {
		URL.revokeObjectURL(url);
	}
};
