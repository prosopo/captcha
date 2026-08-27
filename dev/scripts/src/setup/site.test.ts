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
import type { ProviderEnvironment } from "@prosopo/env";
import { LogLevel, getLogger } from "@prosopo/logger";
import { CaptchaType, type IUserSettings, type Tier } from "@prosopo/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

interface RegisterCall {
	siteKey: string;
	tier: Tier;
	settings: IUserSettings;
}

const calls: RegisterCall[] = [];

// `@prosopo/provider` pulls in the whole server stack, so the only method the
// unit under test touches is stubbed out here.
vi.mock("@prosopo/provider", () => ({
	Tasks: class {
		clientTaskManager = {
			registerSiteKey: (
				siteKey: string,
				tier: Tier,
				settings: IUserSettings,
			): Promise<void> => {
				calls.push({ siteKey, tier, settings });
				return Promise.resolve();
			},
		};
	},
}));

const { registerSiteKey } = await import("./site.js");

const env = {
	logger: getLogger(LogLevel.enum.error, "site.test"),
} as unknown as ProviderEnvironment;

const lastCall = (): RegisterCall => {
	const call = calls[calls.length - 1];
	if (!call) {
		throw new Error("registerSiteKey was never called");
	}
	return call;
};

const register = async (
	settings: Partial<IUserSettings> = {},
): Promise<RegisterCall> => {
	await registerSiteKey(env, "site-key", settings);
	return lastCall();
};

beforeEach(() => {
	calls.length = 0;
});

describe("registerSiteKey", () => {
	it("passes the site key through unchanged", async () => {
		expect((await register()).siteKey).toBe("site-key");
	});

	it("registers at the professional tier", async () => {
		expect((await register()).tier).toBe("professional");
	});

	it("defaults to the frictionless captcha type", async () => {
		expect((await register()).settings.captchaType).toBe(
			CaptchaType.frictionless,
		);
	});

	it("applies the default thresholds and difficulty", async () => {
		const { settings } = await register();
		expect(settings.frictionlessThreshold.frictionlessPuzzleThreshold).toBe(
			0.8,
		);
		expect(settings.imageThreshold).toBe(0.8);
		expect(settings.powDifficulty).toBe(4);
	});

	it("defaults to the local domains when none are given", async () => {
		expect((await register()).settings.domains).toEqual([
			"localhost",
			"0.0.0.0",
		]);
	});

	it("falls back to the local domains for an empty domain list", async () => {
		expect((await register({ domains: [] })).settings.domains).toEqual([
			"localhost",
			"0.0.0.0",
		]);
	});

	it("keeps caller supplied domains", async () => {
		expect(
			(await register({ domains: ["example.com"] })).settings.domains,
		).toEqual(["example.com"]);
	});

	it("lets the caller override the captcha type", async () => {
		expect(
			(await register({ captchaType: CaptchaType.image })).settings.captchaType,
		).toBe(CaptchaType.image);
	});

	it("lets the caller override the thresholds", async () => {
		const { settings } = await register({
			frictionlessThreshold: 0.1,
			imageThreshold: 0.2,
			powDifficulty: 9,
		});
		expect(settings.frictionlessThreshold.frictionlessPuzzleThreshold).toBe(
			0.1,
		);
		expect(settings.imageThreshold).toBe(0.2);
		expect(settings.powDifficulty).toBe(9);
	});

	it("rejects settings that fail schema validation", async () => {
		await expect(
			registerSiteKey(env, "site-key", {
				frictionlessThreshold: "high" as unknown as number,
			}),
		).rejects.toThrow();
		expect(calls).toHaveLength(0);
	});

	it("registers once per call", async () => {
		await register();
		await register();
		expect(calls).toHaveLength(2);
	});
});
