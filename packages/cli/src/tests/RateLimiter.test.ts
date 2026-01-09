import { AdminApiPaths, ClientApiPaths, PublicApiPaths } from "@prosopo/types";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { getRateLimitConfig } from "../RateLimiter.js";

describe("RateLimiter", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv };
		// Clear all rate limit env vars
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
		process.env = originalEnv;
	});

	describe("getRateLimitConfig", () => {
		test("should return config object with all expected paths", () => {
			const config = getRateLimitConfig();
			expect(config).toHaveProperty(ClientApiPaths.GetImageCaptchaChallenge);
			expect(config).toHaveProperty(ClientApiPaths.GetPowCaptchaChallenge);
			expect(config).toHaveProperty(ClientApiPaths.SubmitImageCaptchaSolution);
			expect(config).toHaveProperty(ClientApiPaths.SubmitPowCaptchaSolution);
			expect(config).toHaveProperty(ClientApiPaths.VerifyPowCaptchaSolution);
			expect(config).toHaveProperty(
				ClientApiPaths.VerifyImageCaptchaSolutionDapp,
			);
			expect(config).toHaveProperty(ClientApiPaths.GetProviderStatus);
			expect(config).toHaveProperty(PublicApiPaths.GetProviderDetails);
			expect(config).toHaveProperty(ClientApiPaths.SubmitUserEvents);
			expect(config).toHaveProperty(AdminApiPaths.SiteKeyRegister);
			expect(config).toHaveProperty(AdminApiPaths.UpdateDetectorKey);
			expect(config).toHaveProperty(AdminApiPaths.RemoveDetectorKey);
			expect(config).toHaveProperty(AdminApiPaths.ToggleMaintenanceMode);
			expect(config).toHaveProperty(
				ClientApiPaths.GetFrictionlessCaptchaChallenge,
			);
		});

		test("should include windowMs and limit for each path", () => {
			const config = getRateLimitConfig();
			for (const pathConfig of Object.values(config)) {
				expect(pathConfig).toHaveProperty("windowMs");
				expect(pathConfig).toHaveProperty("limit");
			}
		});

		test("should use environment variable for windowMs when set", () => {
			process.env.PROSOPO_GET_IMAGE_CAPTCHA_CHALLENGE_WINDOW = "60000";
			const config = getRateLimitConfig();
			expect(config[ClientApiPaths.GetImageCaptchaChallenge].windowMs).toBe(
				"60000",
			);
		});

		test("should use environment variable for limit when set", () => {
			process.env.PROSOPO_GET_IMAGE_CAPTCHA_CHALLENGE_LIMIT = "100";
			const config = getRateLimitConfig();
			expect(config[ClientApiPaths.GetImageCaptchaChallenge].limit).toBe("100");
		});

		test("should use undefined when environment variables are not set", () => {
			const config = getRateLimitConfig();
			expect(
				config[ClientApiPaths.GetImageCaptchaChallenge].windowMs,
			).toBeUndefined();
			expect(
				config[ClientApiPaths.GetImageCaptchaChallenge].limit,
			).toBeUndefined();
		});

		test("should handle all client API paths", () => {
			process.env.PROSOPO_GET_POW_CAPTCHA_CHALLENGE_WINDOW = "30000";
			process.env.PROSOPO_GET_POW_CAPTCHA_CHALLENGE_LIMIT = "50";
			process.env.PROSOPO_SUBMIT_IMAGE_CAPTCHA_SOLUTION_WINDOW = "120000";
			process.env.PROSOPO_SUBMIT_IMAGE_CAPTCHA_SOLUTION_LIMIT = "200";
			const config = getRateLimitConfig();
			expect(config[ClientApiPaths.GetPowCaptchaChallenge].windowMs).toBe(
				"30000",
			);
			expect(config[ClientApiPaths.GetPowCaptchaChallenge].limit).toBe("50");
			expect(config[ClientApiPaths.SubmitImageCaptchaSolution].windowMs).toBe(
				"120000",
			);
			expect(config[ClientApiPaths.SubmitImageCaptchaSolution].limit).toBe(
				"200",
			);
		});

		test("should handle admin API paths", () => {
			process.env.PROSOPO_SITE_KEY_REGISTER_WINDOW = "60000";
			process.env.PROSOPO_SITE_KEY_REGISTER_LIMIT = "10";
			process.env.PROSOPO_UPDATE_DETECTOR_KEY_WINDOW = "30000";
			process.env.PROSOPO_UPDATE_DETECTOR_KEY_LIMIT = "5";
			const config = getRateLimitConfig();
			expect(config[AdminApiPaths.SiteKeyRegister].windowMs).toBe("60000");
			expect(config[AdminApiPaths.SiteKeyRegister].limit).toBe("10");
			expect(config[AdminApiPaths.UpdateDetectorKey].windowMs).toBe("30000");
			expect(config[AdminApiPaths.UpdateDetectorKey].limit).toBe("5");
		});

		test("should handle public API paths", () => {
			process.env.PROSOPO_GET_PROVIDER_DETAILS_WINDOW = "60000";
			process.env.PROSOPO_GET_PROVIDER_DETAILS_LIMIT = "1000";
			const config = getRateLimitConfig();
			expect(config[PublicApiPaths.GetProviderDetails].windowMs).toBe("60000");
			expect(config[PublicApiPaths.GetProviderDetails].limit).toBe("1000");
		});
	});
});
