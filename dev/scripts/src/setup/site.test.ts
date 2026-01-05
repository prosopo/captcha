// Copyright 2021-2025 Prosopo (UK) Ltd.
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

import { describe, expect, it, vi, beforeEach } from "vitest";
import { registerSiteKey } from "./site.js";
import { Tasks } from "@prosopo/provider";
import {
	CaptchaType,
	ClientSettingsSchema,
	Tier,
} from "@prosopo/types";

vi.mock("@prosopo/provider");

describe("registerSiteKey", () => {
	const mockEnv = {
		logger: {
			info: vi.fn(),
			debug: vi.fn(),
			error: vi.fn(),
			warn: vi.fn(),
		},
	} as any;

	const mockTasks = {
		clientTaskManager: {
			registerSiteKey: vi.fn().mockResolvedValue(undefined),
		},
	};

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(Tasks).mockImplementation(() => mockTasks as any);
	});

	it("should register site key with default settings", async () => {
		const siteKey = "test_site_key_123456789012345678901234567890123456";
		await registerSiteKey(mockEnv, siteKey);

		expect(Tasks).toHaveBeenCalledWith(mockEnv);
		expect(mockTasks.clientTaskManager.registerSiteKey).toHaveBeenCalledWith(
			siteKey,
			Tier.Professional,
			expect.objectContaining({
				captchaType: CaptchaType.frictionless,
				frictionlessThreshold: 0.8,
				powDifficulty: 4,
				imageThreshold: 0.8,
				domains: ["localhost", "0.0.0.0"],
			}),
		);
	});

	it("should register site key with custom settings", async () => {
		const siteKey = "test_site_key_123456789012345678901234567890123456";
		const customSettings = {
			captchaType: CaptchaType.image,
			frictionlessThreshold: 0.9,
			domains: ["example.com"],
		};

		await registerSiteKey(mockEnv, siteKey, customSettings);

		expect(mockTasks.clientTaskManager.registerSiteKey).toHaveBeenCalledWith(
			siteKey,
			Tier.Professional,
			expect.objectContaining({
				captchaType: CaptchaType.image,
				frictionlessThreshold: 0.9,
				domains: ["example.com"],
			}),
		);
	});

	it("should use default domains when empty domains array provided", async () => {
		const siteKey = "test_site_key_123456789012345678901234567890123456";
		await registerSiteKey(mockEnv, siteKey, { domains: [] });

		expect(mockTasks.clientTaskManager.registerSiteKey).toHaveBeenCalledWith(
			siteKey,
			Tier.Professional,
			expect.objectContaining({
				domains: ["localhost", "0.0.0.0"],
			}),
		);
	});

	it("should use custom domains when provided", async () => {
		const siteKey = "test_site_key_123456789012345678901234567890123456";
		await registerSiteKey(mockEnv, siteKey, {
			domains: ["custom1.com", "custom2.com"],
		});

		expect(mockTasks.clientTaskManager.registerSiteKey).toHaveBeenCalledWith(
			siteKey,
			Tier.Professional,
			expect.objectContaining({
				domains: ["custom1.com", "custom2.com"],
			}),
		);
	});

	it("should log registration info", async () => {
		const siteKey = "test_site_key_123456789012345678901234567890123456";
		await registerSiteKey(mockEnv, siteKey);

		expect(mockEnv.logger.info).toHaveBeenCalled();
		const logCall = mockEnv.logger.info.mock.calls[0][0];
		expect(logCall()).toEqual(
			expect.objectContaining({
				msg: "registerSiteKey",
				data: expect.objectContaining({
					siteKey,
				}),
			}),
		);
	});
});

