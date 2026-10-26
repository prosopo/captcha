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
	type ProcaptchaClientConfigInput,
	type ProcaptchaClientConfigOutput,
	ProcaptchaConfigSchema,
} from "@prosopo/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The frictionless POST is the first provider call a page makes, so it must
// carry the widget's language like every later one.

const mocks = vi.hoisted(() => {
	const headers: (Readonly<Record<string, string>> | undefined)[] = [];
	return {
		headers,
		getFrictionlessCaptcha: vi.fn(),
		assignDetectorBundle: vi.fn(),
		detect: vi.fn(),
	};
});

vi.mock("@prosopo/api", () => ({
	ProviderApi: vi.fn(function (
		_url: string,
		_account: string,
		_timeoutMs?: number,
		defaultHeaders?: Readonly<Record<string, string>>,
	) {
		mocks.headers.push(defaultHeaders);
		return {
			getFrictionlessCaptcha: mocks.getFrictionlessCaptcha,
			assignDetectorBundle: mocks.assignDetectorBundle,
		};
	}),
}));

vi.mock("@prosopo/procaptcha-common", () => ({
	ExtensionLoader: vi.fn(async () => {
		return class FakeExtension {
			getAccount() {
				return Promise.resolve({
					account: { address: "5FakeUserAccountAddress" },
				});
			}
		};
	}),
	getProcaptchaRandomActiveProvider: vi.fn(async () => ({
		providerAccount: "dns-routed",
		provider: { url: "https://provider.test" },
	})),
	pickIpMode: vi.fn(() => undefined),
	resolveClientSessionId: vi.fn(
		(clientSessionId?: string): string | undefined => clientSessionId,
	),
}));

vi.mock("../detectorLoader.js", () => ({
	DetectorLoaderFromScript: vi.fn(async () => mocks.detect),
}));

import customDetectBot from "../customDetectBot.js";

const config = (
	overrides: Partial<ProcaptchaClientConfigInput> = {},
): ProcaptchaClientConfigOutput =>
	ProcaptchaConfigSchema.parse({
		account: { address: "5FakeSiteKey" },
		defaultEnvironment: "production",
		web2: true,
		...overrides,
	});

beforeEach(() => {
	mocks.headers.length = 0;
	mocks.assignDetectorBundle.mockResolvedValue({
		useProviderBundle: true,
		detectorSessionId: "det-1",
		detectorScript: "SELF_CONTAINED_ESM",
		status: "ok",
	});
	mocks.detect.mockResolvedValue({
		token: "TOKEN",
		encryptHeadHash: "HASH",
		userAccount: { account: { address: "5FakeUserAccountAddress" } },
	});
	mocks.getFrictionlessCaptcha.mockResolvedValue({
		captchaType: "pow",
		sessionId: "SID",
		status: "ok",
	});
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("customDetectBot language", () => {
	it("sends the site's language, not the browser's", async () => {
		vi.stubGlobal("navigator", { languages: ["de"] });
		await customDetectBot(
			config({ language: "tr" }),
			undefined,
			() => undefined,
		);
		expect(mocks.headers).toEqual([{ "Prosopo-Lang": "tr" }]);
	});

	it("sends the browser's languages when the site set none", async () => {
		vi.stubGlobal("navigator", { languages: ["tr-TR", "en"] });
		await customDetectBot(config(), undefined, () => undefined);
		expect(mocks.headers).toEqual([{ "Prosopo-Lang": "tr-TR,en" }]);
	});
});
