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

import {
	type AssignDetectorBundleResponse,
	DetectorLoadFailure,
} from "@prosopo/types";
import {
	DetectorLoaderFromScript,
	type DetectorType,
} from "./detectorLoader.js";
import {
	DetectorLoadError,
	DetectorLoaderFromUrl,
} from "./detectorScriptTag.js";

export type LoadedDetector = {
	detect: DetectorType;
	// The assignment the detector came from. Differs from the one passed in
	// when the URL load failed and an inline copy was assigned instead.
	assigned: AssignDetectorBundleResponse;
	// The URL load failure that was recovered from, if there was one.
	recoveredFrom?: DetectorLoadFailure;
};

export type DetectorLoaders = {
	fromUrl: (url: string) => Promise<DetectorType>;
	fromScript: (script: string) => Promise<DetectorType>;
};

const defaultLoaders: DetectorLoaders = {
	fromUrl: (url) => DetectorLoaderFromUrl(url),
	fromScript: (script) => DetectorLoaderFromScript(script),
};

const failureOf = (err: unknown): DetectorLoadFailure =>
	err instanceof DetectorLoadError
		? err.reason
		: DetectorLoadFailure.scriptLoadError;

const loadInline = async (
	assigned: AssignDetectorBundleResponse,
	loaders: DetectorLoaders,
): Promise<DetectorType> => {
	if (!assigned.useProviderBundle || !assigned.detectorScript) {
		throw new DetectorLoadError(DetectorLoadFailure.noBundle);
	}
	try {
		return await loaders.fromScript(assigned.detectorScript);
	} catch (err) {
		throw new DetectorLoadError(DetectorLoadFailure.inlineImportFailed, err);
	}
};

/**
 * Loads the detector an assign call handed out: from its URL when the
 * provider returned one, otherwise inline. A failed URL load asks the
 * provider again for an inline copy, so a page whose CSP does not allow the
 * provider origin still gets a detector wherever it allows `blob:` or
 * `data:`.
 *
 * Rejects with a {@link DetectorLoadError}. When both routes fail, the reason
 * is the URL failure, since that is the route the site needs to fix.
 */
export const loadAssignedDetector = async (
	assigned: AssignDetectorBundleResponse,
	providerUrl: string,
	assignInline: () => Promise<AssignDetectorBundleResponse>,
	loaders: DetectorLoaders = defaultLoaders,
): Promise<LoadedDetector> => {
	if (!assigned.useProviderBundle) {
		throw new DetectorLoadError(DetectorLoadFailure.noBundle);
	}
	if (!assigned.detectorScriptPath) {
		return { detect: await loadInline(assigned, loaders), assigned };
	}

	let urlFailure: DetectorLoadFailure;
	try {
		const url = new URL(assigned.detectorScriptPath, providerUrl).href;
		return { detect: await loaders.fromUrl(url), assigned };
	} catch (err) {
		urlFailure = failureOf(err);
		console.warn("Procaptcha: detector script failed to load:", err);
	}

	try {
		const inline = await assignInline();
		return {
			detect: await loadInline(inline, loaders),
			assigned: inline,
			recoveredFrom: urlFailure,
		};
	} catch (err) {
		throw new DetectorLoadError(urlFailure, err);
	}
};
