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
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DetectorType } from "../detectorLoader.js";
import { DetectorLoadError } from "../detectorScriptTag.js";
import {
	type DetectorLoaders,
	loadAssignedDetector,
} from "../loadAssignedDetector.js";

const PROVIDER_URL = "https://pronode1.prosopo.io";
const SCRIPT_PATH =
	"/v1/prosopo/provider/client/detector/script?detectorSessionId=det-url";

const urlDetector = (() => "url") as unknown as DetectorType;
const inlineDetector = (() => "inline") as unknown as DetectorType;

const byUrl: AssignDetectorBundleResponse = {
	useProviderBundle: true,
	detectorSessionId: "det-url",
	detectorScriptPath: SCRIPT_PATH,
	status: "ok",
};

const inline: AssignDetectorBundleResponse = {
	useProviderBundle: true,
	detectorSessionId: "det-inline",
	detectorScript: "SELF_CONTAINED_ESM",
	status: "ok",
};

const reasonOf = async (promise: Promise<unknown>): Promise<string> => {
	const err = await promise.then(
		() => undefined,
		(e: unknown) => e,
	);
	expect(err).toBeInstanceOf(DetectorLoadError);
	return (err as DetectorLoadError).reason;
};

describe("loadAssignedDetector", () => {
	const fromUrl = vi.fn(
		async (_url: string): Promise<DetectorType> => urlDetector,
	);
	const fromScript = vi.fn(
		async (_script: string): Promise<DetectorType> => inlineDetector,
	);
	const assignInline = vi.fn(
		async (): Promise<AssignDetectorBundleResponse> => inline,
	);
	const loaders: DetectorLoaders = { fromUrl, fromScript };

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("loads from the provider URL when one was assigned", async () => {
		const loaded = await loadAssignedDetector(
			byUrl,
			PROVIDER_URL,
			assignInline,
			loaders,
		);

		expect(fromUrl).toHaveBeenCalledWith(`${PROVIDER_URL}${SCRIPT_PATH}`);
		expect(loaded).toEqual({ detect: urlDetector, assigned: byUrl });
		expect(assignInline).not.toHaveBeenCalled();
	});

	it("loads inline from a provider that ignored the URL request", async () => {
		const loaded = await loadAssignedDetector(
			inline,
			PROVIDER_URL,
			assignInline,
			loaders,
		);

		expect(fromScript).toHaveBeenCalledWith(inline.detectorScript);
		expect(fromUrl).not.toHaveBeenCalled();
		expect(loaded.detect).toBe(inlineDetector);
	});

	it("falls back to a fresh inline assignment when the URL load fails", async () => {
		fromUrl.mockRejectedValueOnce(
			new DetectorLoadError(DetectorLoadFailure.scriptCspBlocked),
		);

		const loaded = await loadAssignedDetector(
			byUrl,
			PROVIDER_URL,
			assignInline,
			loaders,
		);

		expect(assignInline).toHaveBeenCalledTimes(1);
		expect(loaded).toEqual({
			detect: inlineDetector,
			assigned: inline,
			recoveredFrom: DetectorLoadFailure.scriptCspBlocked,
		});
	});

	it("reports the URL failure when the inline fallback also fails", async () => {
		fromUrl.mockRejectedValueOnce(
			new DetectorLoadError(DetectorLoadFailure.scriptLoadError),
		);
		fromScript.mockRejectedValueOnce(new TypeError("blocked"));

		expect(
			await reasonOf(
				loadAssignedDetector(byUrl, PROVIDER_URL, assignInline, loaders),
			),
		).toBe(DetectorLoadFailure.scriptLoadError);
	});

	it("reports an inline import failure", async () => {
		fromScript.mockRejectedValueOnce(new TypeError("blocked"));

		expect(
			await reasonOf(
				loadAssignedDetector(inline, PROVIDER_URL, assignInline, loaders),
			),
		).toBe(DetectorLoadFailure.inlineImportFailed);
	});

	it("reports no bundle when the provider has none", async () => {
		expect(
			await reasonOf(
				loadAssignedDetector(
					{ useProviderBundle: false, status: "ok" },
					PROVIDER_URL,
					assignInline,
					loaders,
				),
			),
		).toBe(DetectorLoadFailure.noBundle);
		expect(fromUrl).not.toHaveBeenCalled();
		expect(fromScript).not.toHaveBeenCalled();
	});
});
