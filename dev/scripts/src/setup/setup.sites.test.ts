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
	CaptchaType,
	type ISite,
	type KeyringPair,
	type ProsopoConfigOutput,
} from "@prosopo/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const pairFor = (address: string): KeyringPair => ({ address }) as KeyringPair;

const sites: ISite[] = [
	{
		address: "5Esjpa4ogV3CnkueyiXet7LL5z5mhvEyi5XJnDGbD2kjzD8W",
		secret: "pow",
		settings: { captchaType: CaptchaType.pow },
	} as ISite,
	{
		address: "5CQ3QeyY82R8h8VWFKTic3FMB3WsbSJExZgbaUqfVJtAFPnb",
		secret: "puzzle",
		settings: { captchaType: CaptchaType.puzzle },
	} as ISite,
];

const addressBySecret: Record<string, string> = {
	provider: "5EjTA28bKSbFPPyMbUjNtArxyqjwq38r1BapVmLZShaqEedV",
	pow: "5Esjpa4ogV3CnkueyiXet7LL5z5mhvEyi5XJnDGbD2kjzD8W",
	puzzle: "5CQ3QeyY82R8h8VWFKTic3FMB3WsbSJExZgbaUqfVJtAFPnb",
};

vi.mock("@prosopo/cli", () => ({
	defaultConfig: (): ProsopoConfigOutput =>
		({
			account: { secret: "provider" },
			authAccount: { secret: "provider" },
		}) as ProsopoConfigOutput,
	getSecret: (): string => "provider",
}));
vi.mock("@prosopo/env", () => ({
	ProviderEnvironment: class {
		logger = {
			info: (): void => undefined,
			debug: (): void => undefined,
		};
		isReady(): Promise<void> {
			return Promise.resolve();
		}
	},
}));
vi.mock("@prosopo/keyring", () => ({
	generateMnemonic: (): Promise<[string, string]> => Promise.resolve(["", ""]),
	getDefaultSiteKeys: (): ISite[] => sites,
	getPair: (secret?: string): KeyringPair =>
		pairFor(addressBySecret[secret ?? ""] ?? ""),
}));
vi.mock("./provider.js", () => ({
	setupProvider: (): Promise<void> => Promise.resolve(),
}));
const registerSiteKey = vi.fn(
	(_env: unknown, _siteKey: string): Promise<void> => Promise.resolve(),
);
vi.mock("./site.js", () => ({
	registerSiteKey: (env: unknown, siteKey: string): Promise<void> =>
		registerSiteKey(env, siteKey),
}));
const updateDemoHTMLFiles = vi.fn(
	(_matchers: RegExp[], _value: string, _logger: unknown): Promise<void> =>
		Promise.resolve(),
);
const updateEnvFiles = vi.fn(
	(_names: string[], _value: string, _logger: unknown): Promise<void> =>
		Promise.resolve(),
);
vi.mock("../util/index.js", () => ({
	updateDemoHTMLFiles: (
		matchers: RegExp[],
		value: string,
		logger: unknown,
	): Promise<void> => updateDemoHTMLFiles(matchers, value, logger),
	updateEnvFiles: (
		names: string[],
		value: string,
		logger: unknown,
	): Promise<void> => updateEnvFiles(names, value, logger),
}));

const { setup } = await import("./setup.js");

beforeEach(() => {
	vi.stubEnv("PROSOPO_SITE_KEY", addressBySecret.pow);
	vi.stubEnv("PROSOPO_PROVIDER_ADDRESS", addressBySecret.provider);
	vi.spyOn(process, "exit").mockImplementation(
		(_code?: string | number | null): never => undefined as never,
	);
});

afterEach(() => {
	vi.unstubAllEnvs();
	vi.restoreAllMocks();
	registerSiteKey.mockClear();
	updateDemoHTMLFiles.mockClear();
	updateEnvFiles.mockClear();
});

describe("setup sites", () => {
	it("registers every default site key", async () => {
		await setup(false, true);
		expect(registerSiteKey.mock.calls.map((call) => call[1])).toEqual([
			addressBySecret.pow,
			addressBySecret.puzzle,
		]);
	});

	it("does not rewrite demo HTML, which would stamp the last site key onto every page", async () => {
		await setup(false, true);
		expect(updateDemoHTMLFiles).not.toHaveBeenCalled();
	});

	it("still points each captcha type's env var at its own key", async () => {
		await setup(false, true);
		expect(updateEnvFiles.mock.calls.map((call) => [call[0], call[1]])).toEqual(
			[
				[["PROSOPO_SITE_KEY_POW"], addressBySecret.pow],
				[["PROSOPO_SITE_KEY_PUZZLE"], addressBySecret.puzzle],
			],
		);
	});
});
