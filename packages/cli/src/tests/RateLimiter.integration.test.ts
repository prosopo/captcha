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

import { AdminApiPaths, ClientApiPaths, PublicApiPaths } from "@prosopo/types";
import { describe, expect, test, beforeEach, afterEach } from "vitest";
import { getRateLimitConfig } from "../RateLimiter.js";

/**
 * Integration tests for RateLimiter configuration
 * Tests environment variable handling and configuration generation
 */
describe("RateLimiter configuration - integration", () => {
	const originalEnv = { ...process.env };

	beforeEach(() => {
		// Clear all rate limit env vars before each test
		Object.keys(process.env).forEach((key) => {
			if (
				key.startsWith("PROSOPO_") &&
				(key.includes("_WINDOW") || key.includes("_LIMIT"))
			) {
				delete process.env[key];
			}
		});
	});

	afterEach(() => {
		// Restore original environment
		process.env = { ...originalEnv };
	});

	test("should return complete rate limit configuration", () => {
		const config = getRateLimitConfig();

		// Verify all expected API paths are configured
		expect(config).toHaveProperty(ClientApiPaths.GetImageCaptchaChallenge);
		expect(config).toHaveProperty(ClientApiPaths.GetPowCaptchaChallenge);
		expect(config).toHaveProperty(ClientApiPaths.SubmitImageCaptchaSolution);
		expect(config).toHaveProperty(ClientApiPaths.SubmitPowCaptchaSolution);
		expect(config).toHaveProperty(ClientApiPaths.VerifyPowCaptchaSolution);
		expect(config).toHaveProperty(ClientApiPaths.VerifyImageCaptchaSolutionDapp);
		expect(config).toHaveProperty(ClientApiPaths.GetProviderStatus);
		expect(config).toHaveProperty(PublicApiPaths.GetProviderDetails);
		expect(config).toHaveProperty(ClientApiPaths.SubmitUserEvents);
		expect(config).toHaveProperty(ClientApiPaths.GetProviderEvents);
		expect(config).toHaveProperty("admin/sitekey/register");
		expect(config).toHaveProperty(AdminApiPaths.UpdateDetectorKey);
		expect(config).toHaveProperty(AdminApiPaths.RemoveDetectorKey);
		expect(config).toHaveProperty(AdminApiPaths.ToggleMaintenanceMode);

		// Verify structure of one config entry
		expect(config[ClientApiPaths.GetImageCaptchaChallenge]).toHaveProperty("windowMs");
		expect(config[ClientApiPaths.GetImageCaptchaChallenge]).toHaveProperty("limit");
	});

	test("should use environment variables when set", () => {
		// Set specific environment variables
		process.env.PROSOPO_GET_IMAGE_CAPTCHA_CHALLENGE_WINDOW = "60000";
		process.env.PROSOPO_GET_IMAGE_CAPTCHA_CHALLENGE_LIMIT = "100";
		process.env.PROSOPO_SUBMIT_IMAGE_CAPTCHA_SOLUTION_WINDOW = "120000";
		process.env.PROSOPO_SUBMIT_IMAGE_CAPTCHA_SOLUTION_LIMIT = "200";

		const config = getRateLimitConfig();

		expect(config[ClientApiPaths.GetImageCaptchaChallenge].windowMs).toBe("60000");
		expect(config[ClientApiPaths.GetImageCaptchaChallenge].limit).toBe("100");
		expect(config[ClientApiPaths.SubmitImageCaptchaSolution].windowMs).toBe("120000");
		expect(config[ClientApiPaths.SubmitImageCaptchaSolution].limit).toBe("200");
	});

	test("should use undefined when environment variables are not set", () => {
		const config = getRateLimitConfig();

		expect(config[ClientApiPaths.GetImageCaptchaChallenge].windowMs).toBeUndefined();
		expect(config[ClientApiPaths.GetImageCaptchaChallenge].limit).toBeUndefined();
		expect(config[ClientApiPaths.SubmitImageCaptchaSolution].windowMs).toBeUndefined();
		expect(config[ClientApiPaths.SubmitImageCaptchaSolution].limit).toBeUndefined();
	});

	test("should handle mixed environment variable settings", () => {
		// Set only some environment variables
		process.env.PROSOPO_GET_POW_CAPTCHA_CHALLENGE_WINDOW = "30000";
		process.env.PROSOPO_GET_POW_CAPTCHA_CHALLENGE_LIMIT = "50";
		// Leave others unset

		const config = getRateLimitConfig();

		expect(config[ClientApiPaths.GetPowCaptchaChallenge].windowMs).toBe("30000");
		expect(config[ClientApiPaths.GetPowCaptchaChallenge].limit).toBe("50");

		// Other configs should be undefined
		expect(config[ClientApiPaths.GetImageCaptchaChallenge].windowMs).toBeUndefined();
		expect(config[ClientApiPaths.GetImageCaptchaChallenge].limit).toBeUndefined();
	});

	test("should handle all rate limit environment variables", () => {
		// Set all possible rate limit environment variables
		const testValues = {
			PROSOPO_GET_IMAGE_CAPTCHA_CHALLENGE_WINDOW: "60000",
			PROSOPO_GET_IMAGE_CAPTCHA_CHALLENGE_LIMIT: "100",
			PROSOPO_GET_POW_CAPTCHA_CHALLENGE_WINDOW: "30000",
			PROSOPO_GET_POW_CAPTCHA_CHALLENGE_LIMIT: "50",
			PROSOPO_SUBMIT_IMAGE_CAPTCHA_SOLUTION_WINDOW: "120000",
			PROSOPO_SUBMIT_IMAGE_CAPTCHA_SOLUTION_LIMIT: "200",
			PROSOPO_SUBMIT_POW_CAPTCHA_SOLUTION_WINDOW: "90000",
			PROSOPO_SUBMIT_POW_CAPTCHA_SOLUTION_LIMIT: "150",
			PROSOPO_VERIFY_POW_CAPTCHA_SOLUTION_WINDOW: "45000",
			PROSOPO_VERIFY_POW_CAPTCHA_SOLUTION_LIMIT: "75",
			PROSOPO_VERIFY_IMAGE_CAPTCHA_SOLUTION_DAPP_WINDOW: "180000",
			PROSOPO_VERIFY_IMAGE_CAPTCHA_SOLUTION_DAPP_LIMIT: "300",
			PROSOPO_GET_PROVIDER_STATUS_WINDOW: "30000",
			PROSOPO_GET_PROVIDER_STATUS_LIMIT: "60",
			PROSOPO_GET_PROVIDER_DETAILS_WINDOW: "60000",
			PROSOPO_GET_PROVIDER_DETAILS_LIMIT: "30",
			PROSOPO_SUBMIT_USER_EVENTS_WINDOW: "30000",
			PROSOPO_SUBMIT_USER_EVENTS_LIMIT: "100",
			PROSOPO_GET_PROVIDER_EVENTS_WINDOW: "60000",
			PROSOPO_GET_PROVIDER_EVENTS_LIMIT: "50",
			PROSOPO_SITE_KEY_REGISTER_WINDOW: "30000",
			PROSOPO_SITE_KEY_REGISTER_LIMIT: "10",
			PROSOPO_UPDATE_DETECTOR_KEY_WINDOW: "60000",
			PROSOPO_UPDATE_DETECTOR_KEY_LIMIT: "5",
			PROSOPO_REMOVE_DETECTOR_KEY_WINDOW: "60000",
			PROSOPO_REMOVE_DETECTOR_KEY_LIMIT: "5",
			PROSOPO_TOGGLE_MAINTENANCE_MODE_WINDOW: "30000",
			PROSOPO_TOGGLE_MAINTENANCE_MODE_LIMIT: "3",
		};

		// Set all environment variables
		Object.entries(testValues).forEach(([key, value]) => {
			process.env[key] = value;
		});

		const config = getRateLimitConfig();

		// Verify all configurations are set correctly
		expect(config[ClientApiPaths.GetImageCaptchaChallenge].windowMs).toBe("60000");
		expect(config[ClientApiPaths.GetImageCaptchaChallenge].limit).toBe("100");
		expect(config[ClientApiPaths.GetPowCaptchaChallenge].windowMs).toBe("30000");
		expect(config[ClientApiPaths.GetPowCaptchaChallenge].limit).toBe("50");
		expect(config[ClientApiPaths.SubmitImageCaptchaSolution].windowMs).toBe("120000");
		expect(config[ClientApiPaths.SubmitImageCaptchaSolution].limit).toBe("200");
		expect(config[ClientApiPaths.SubmitPowCaptchaSolution].windowMs).toBe("90000");
		expect(config[ClientApiPaths.SubmitPowCaptchaSolution].limit).toBe("150");
		expect(config[ClientApiPaths.VerifyPowCaptchaSolution].windowMs).toBe("45000");
		expect(config[ClientApiPaths.VerifyPowCaptchaSolution].limit).toBe("75");
		expect(config[ClientApiPaths.VerifyImageCaptchaSolutionDapp].windowMs).toBe("180000");
		expect(config[ClientApiPaths.VerifyImageCaptchaSolutionDapp].limit).toBe("300");
		expect(config[ClientApiPaths.GetProviderStatus].windowMs).toBe("30000");
		expect(config[ClientApiPaths.GetProviderStatus].limit).toBe("60");
		expect(config[PublicApiPaths.GetProviderDetails].windowMs).toBe("60000");
		expect(config[PublicApiPaths.GetProviderDetails].limit).toBe("30");
		expect(config[ClientApiPaths.SubmitUserEvents].windowMs).toBe("30000");
		expect(config[ClientApiPaths.SubmitUserEvents].limit).toBe("100");
		expect(config[ClientApiPaths.GetProviderEvents].windowMs).toBe("60000");
		expect(config[ClientApiPaths.GetProviderEvents].limit).toBe("50");
		expect(config["admin/sitekey/register"].windowMs).toBe("30000");
		expect(config["admin/sitekey/register"].limit).toBe("10");
		expect(config[AdminApiPaths.UpdateDetectorKey].windowMs).toBe("60000");
		expect(config[AdminApiPaths.UpdateDetectorKey].limit).toBe("5");
		expect(config[AdminApiPaths.RemoveDetectorKey].windowMs).toBe("60000");
		expect(config[AdminApiPaths.RemoveDetectorKey].limit).toBe("5");
		expect(config[AdminApiPaths.ToggleMaintenanceMode].windowMs).toBe("30000");
		expect(config[AdminApiPaths.ToggleMaintenanceMode].limit).toBe("3");
	});
});