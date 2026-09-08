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
	MouseMovementPoint,
	PackedBehavioralData,
	TouchEventPoint,
} from "@prosopo/types";

// The detector is NOT bundled into the widget — it lives only in the
// provider-served pool bundles, loaded at runtime via a blob URL below. So the
// signature is declared locally here (mirroring `@prosopo/detector`'s default
// export) from shared @prosopo/types primitives, rather than importing the
// detector package as a build-time type dependency.
export type DetectorType = (
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

interface LoaderAttempt {
	readonly url: string;
	readonly release: () => void;
}

const blobAttempt = (script: string): LoaderAttempt => {
	const url = URL.createObjectURL(
		new Blob([script], { type: "text/javascript" }),
	);
	return { url, release: (): void => URL.revokeObjectURL(url) };
};

const dataAttempt = (script: string): LoaderAttempt => ({
	url: `data:text/javascript;charset=utf-8,${encodeURIComponent(script)}`,
	release: (): void => undefined,
});

/** Injection point for tests; real callers never pass this. */
export type ModuleImporter = (url: string) => Promise<unknown>;

const defaultImporter: ModuleImporter = (url) =>
	import(/* @vite-ignore */ /* webpackIgnore: true */ url);

/**
 * Loads a detector from a provider-served obfuscated ESM string (the
 * per-session pool bundle). The module is self-contained, so a dynamic
 * `import()` yields its default export.
 *
 * A blob URL is tried first, then a `data:` URL. The two are gated by
 * different CSP directives and sites commonly allow one without the other — a
 * `script-src` of `*` matches neither, and a policy listing `data:` for
 * scripts and `blob:` only for workers blocks the blob path outright. Without
 * the fallback every session on such a site loses the detector, sends an empty
 * token, and can never pass frictionlessly.
 *
 * A blocked attempt logs a CSP violation before the import rejects. That noise
 * is the cost of recovering the session.
 */
export const DetectorLoaderFromScript = async (
	script: string,
	importModule: ModuleImporter = defaultImporter,
): Promise<DetectorType> => {
	let lastError: unknown = new Error("no loader attempt ran");
	for (const build of [blobAttempt, dataAttempt]) {
		let attempt: LoaderAttempt | undefined;
		try {
			attempt = build(script);
			const mod = (await importModule(attempt.url)) as {
				default: DetectorType;
			};
			return mod.default;
		} catch (err) {
			lastError = err;
		} finally {
			attempt?.release();
		}
	}
	throw lastError;
};
