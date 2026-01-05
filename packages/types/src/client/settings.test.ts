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
import { describe, expect, it } from "vitest";
import { CaptchaType } from "./captchaType/captchaType.js";
import {
	ClientSettingsSchema,
	ContextConfigSchema,
	ContextType,
	ContextTypeSchema,
	IPValidationAction,
	IPValidationActionSchema,
	IPValidationRulesSchema,
	abuseScoreThresholdDefault,
	abuseScoreThresholdExceedActionDefault,
	captchaTypeDefault,
	cityChangeActionDefault,
	contextAwareThresholdDefault,
	countryChangeActionDefault,
	distanceExceedActionDefault,
	distanceThresholdKmDefault,
	domainsDefault,
	frictionlessThresholdDefault,
	imageThresholdDefault,
	ispChangeActionDefault,
	powDifficultyDefault,
	requireAllConditionsDefault,
} from "./settings.js";

describe("settings", () => {
	describe("default values", () => {
		it("has correct captchaTypeDefault", () => {
			expect(captchaTypeDefault).toBe(CaptchaType.frictionless);
		});

		it("has correct domainsDefault", () => {
			expect(domainsDefault).toEqual([]);
		});

		it("has correct frictionlessThresholdDefault", () => {
			expect(frictionlessThresholdDefault).toBe(0.5);
		});

		it("has correct powDifficultyDefault", () => {
			expect(powDifficultyDefault).toBe(4);
		});

		it("has correct imageThresholdDefault", () => {
			expect(imageThresholdDefault).toBe(0.8);
		});

		it("has correct contextAwareThresholdDefault", () => {
			expect(contextAwareThresholdDefault).toBe(0.7);
		});

		it("has correct IP validation action defaults", () => {
			expect(countryChangeActionDefault).toBe(IPValidationAction.Allow);
			expect(cityChangeActionDefault).toBe(IPValidationAction.Allow);
			expect(ispChangeActionDefault).toBe(IPValidationAction.Allow);
			expect(distanceExceedActionDefault).toBe(IPValidationAction.Reject);
			expect(abuseScoreThresholdExceedActionDefault).toBe(
				IPValidationAction.Reject,
			);
		});

		it("has correct IP validation threshold defaults", () => {
			expect(distanceThresholdKmDefault).toBe(1000);
			expect(abuseScoreThresholdDefault).toBe(0.005);
			expect(requireAllConditionsDefault).toBe(false);
		});
	});

	describe("IPValidationAction enum", () => {
		it("has correct enum values", () => {
			expect(IPValidationAction.Allow).toBe("allow");
			expect(IPValidationAction.Reject).toBe("reject");
			expect(IPValidationAction.Flag).toBe("flag");
		});
	});

	describe("IPValidationActionSchema", () => {
		it("validates Allow action", () => {
			expect(() =>
				IPValidationActionSchema.parse(IPValidationAction.Allow),
			).not.toThrow();
		});

		it("validates Reject action", () => {
			expect(() =>
				IPValidationActionSchema.parse(IPValidationAction.Reject),
			).not.toThrow();
		});

		it("validates Flag action", () => {
			expect(() =>
				IPValidationActionSchema.parse(IPValidationAction.Flag),
			).not.toThrow();
		});

		it("rejects invalid action", () => {
			expect(() => IPValidationActionSchema.parse("invalid")).toThrow();
		});
	});

	describe("IPValidationRulesSchema", () => {
		it("validates IP validation rules with defaults", () => {
			const rules = {
				actions: {},
			};

			const result = IPValidationRulesSchema.parse(rules);
			expect(result.actions.countryChangeAction).toBe(
				countryChangeActionDefault,
			);
			expect(result.actions.cityChangeAction).toBe(cityChangeActionDefault);
			expect(result.actions.ispChangeAction).toBe(ispChangeActionDefault);
			expect(result.distanceThresholdKm).toBe(distanceThresholdKmDefault);
			expect(result.abuseScoreThreshold).toBe(abuseScoreThresholdDefault);
			expect(result.requireAllConditions).toBe(requireAllConditionsDefault);
		});

		it("validates IP validation rules with custom values", () => {
			const rules = {
				actions: {
					countryChangeAction: IPValidationAction.Reject,
				},
				distanceThresholdKm: 500,
				abuseScoreThreshold: 0.01,
			};

			const result = IPValidationRulesSchema.parse(rules);
			expect(result.actions.countryChangeAction).toBe(
				IPValidationAction.Reject,
			);
			expect(result.distanceThresholdKm).toBe(500);
			expect(result.abuseScoreThreshold).toBe(0.01);
		});

		it("validates IP validation rules with country overrides", () => {
			const rules = {
				actions: {},
				countryOverrides: {
					US: {
						actions: {
							countryChangeAction: IPValidationAction.Flag,
						},
						distanceThresholdKm: 200,
					},
				},
			};

			expect(() => IPValidationRulesSchema.parse(rules)).not.toThrow();
		});
	});

	describe("ContextType enum", () => {
		it("has correct enum values", () => {
			expect(ContextType.Default).toBe("default");
			expect(ContextType.Webview).toBe("webview");
		});
	});

	describe("ContextTypeSchema", () => {
		it("validates Default context", () => {
			expect(() => ContextTypeSchema.parse(ContextType.Default)).not.toThrow();
		});

		it("validates Webview context", () => {
			expect(() => ContextTypeSchema.parse(ContextType.Webview)).not.toThrow();
		});

		it("rejects invalid context", () => {
			expect(() => ContextTypeSchema.parse("invalid")).toThrow();
		});
	});

	describe("ContextConfigSchema", () => {
		it("validates context config with type only", () => {
			const config = {
				type: ContextType.Default,
			};

			const result = ContextConfigSchema.parse(config);
			expect(result.type).toBe(ContextType.Default);
			expect(result.threshold).toBe(contextAwareThresholdDefault);
		});

		it("validates context config with custom threshold", () => {
			const config = {
				type: ContextType.Webview,
				threshold: 0.9,
			};

			const result = ContextConfigSchema.parse(config);
			expect(result.type).toBe(ContextType.Webview);
			expect(result.threshold).toBe(0.9);
		});
	});

	describe("ClientSettingsSchema", () => {
		it("validates settings with defaults", () => {
			const settings = {};

			const result = ClientSettingsSchema.parse(settings);
			expect(result.captchaType).toBe(captchaTypeDefault);
			expect(result.domains).toEqual(domainsDefault);
			expect(result.frictionlessThreshold).toBe(frictionlessThresholdDefault);
			expect(result.powDifficulty).toBe(powDifficultyDefault);
			expect(result.imageThreshold).toBe(imageThresholdDefault);
		});

		it("validates settings with custom values", () => {
			const settings = {
				captchaType: CaptchaType.image,
				domains: ["example.com"],
				frictionlessThreshold: 0.6,
				powDifficulty: 5,
				imageThreshold: 0.9,
			};

			const result = ClientSettingsSchema.parse(settings);
			expect(result.captchaType).toBe(CaptchaType.image);
			expect(result.domains).toEqual(["example.com"]);
			expect(result.frictionlessThreshold).toBe(0.6);
			expect(result.powDifficulty).toBe(5);
			expect(result.imageThreshold).toBe(0.9);
		});

		it("validates settings with IP validation rules", () => {
			const settings = {
				ipValidationRules: {
					actions: {
						countryChangeAction: IPValidationAction.Reject,
					},
				},
			};

			expect(() => ClientSettingsSchema.parse(settings)).not.toThrow();
		});

		it("validates settings with context aware config", () => {
			const settings = {
				contextAware: {
					enabled: true,
					contexts: {
						[ContextType.Default]: {
							type: ContextType.Default,
							threshold: 0.8,
						},
					},
				},
			};

			expect(() => ClientSettingsSchema.parse(settings)).not.toThrow();
		});

		it("validates settings with disallowWebView", () => {
			const settings = {
				disallowWebView: true,
			};

			const result = ClientSettingsSchema.parse(settings);
			expect(result.disallowWebView).toBe(true);
		});
	});
});
