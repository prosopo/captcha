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
import {
	AccountCreatorConfigSchema,
	CaptchaTimeoutSchema,
	DatabaseConfigSchema,
	DatabaseTypes,
	EnvironmentTypesSchema,
	IpApiServiceSpec,
	Mode,
	ModeEnum,
	PolkadotSecretJSONSpec,
	ProcaptchaConfigSchema,
	ProsopoApiConfigSchema,
	ProsopoBaseConfigSchema,
	ProsopoBasicConfigSchema,
	ProsopoCaptchaSolutionConfigSchema,
	ProsopoClientConfigSchema,
	ProsopoConfigSchema,
} from "./config.js";
import {
	DEFAULT_IMAGE_CAPTCHA_SOLUTION_TIMEOUT,
	DEFAULT_IMAGE_CAPTCHA_TIMEOUT,
	DEFAULT_IMAGE_CAPTCHA_VERIFIED_TIMEOUT,
	DEFAULT_IMAGE_MAX_VERIFIED_TIME_CACHED,
	DEFAULT_MAX_VERIFIED_TIME_CONTRACT,
	DEFAULT_POW_CAPTCHA_CACHED_TIMEOUT,
	DEFAULT_POW_CAPTCHA_SOLUTION_TIMEOUT,
	DEFAULT_POW_CAPTCHA_VERIFIED_TIMEOUT,
} from "./timeouts.js";

describe("config", () => {
	describe("DatabaseTypes", () => {
		it("has correct enum values", () => {
			expect(DatabaseTypes.enum.mongo).toBe("mongo");
			expect(DatabaseTypes.enum.mongoMemory).toBe("mongoMemory");
			expect(DatabaseTypes.enum.provider).toBe("provider");
			expect(DatabaseTypes.enum.client).toBe("client");
			expect(DatabaseTypes.enum.captcha).toBe("captcha");
		});
	});

	describe("EnvironmentTypesSchema", () => {
		it("validates development environment", () => {
			expect(() => EnvironmentTypesSchema.parse("development")).not.toThrow();
		});

		it("validates staging environment", () => {
			expect(() => EnvironmentTypesSchema.parse("staging")).not.toThrow();
		});

		it("validates production environment", () => {
			expect(() => EnvironmentTypesSchema.parse("production")).not.toThrow();
		});

		it("rejects invalid environment", () => {
			expect(() => EnvironmentTypesSchema.parse("invalid")).toThrow();
		});
	});

	describe("DatabaseConfigSchema", () => {
		it("validates database config", () => {
			const config = {
				development: {
					type: "mongo",
					endpoint: "mongodb://localhost:27017",
					dbname: "test",
					authSource: "admin",
				},
			};

			expect(() => DatabaseConfigSchema.parse(config)).not.toThrow();
		});

		it("validates database config with defaults", () => {
			const config = {
				development: {
					type: "mongo",
					endpoint: "mongodb://localhost:27017",
				},
			};

			const result = DatabaseConfigSchema.parse(config);
			expect(result.development.dbname).toBe("prosopo");
			expect(result.development.authSource).toBe("admin");
		});
	});

	describe("ProsopoBaseConfigSchema", () => {
		it("validates base config with defaults", () => {
			const config = {
				account: {},
			};

			const result = ProsopoBaseConfigSchema.parse(config);
			expect(result.logLevel).toBe("info");
			expect(result.defaultEnvironment).toBe("production");
		});

		it("validates base config with custom values", () => {
			const config = {
				logLevel: "debug",
				defaultEnvironment: "development",
				account: {
					address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
				},
			};

			const result = ProsopoBaseConfigSchema.parse(config);
			expect(result.logLevel).toBe("debug");
			expect(result.defaultEnvironment).toBe("development");
		});
	});

	describe("PolkadotSecretJSONSpec", () => {
		it("validates polkadot secret JSON", () => {
			const secret = {
				encoded: "encoded",
				encoding: {
					content: ["content"],
					type: ["type"],
					version: "1",
				},
				address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
				meta: {
					genesisHash: "0x1234",
					name: "test",
					whenCreated: 1234567890,
				},
			};

			expect(() => PolkadotSecretJSONSpec.parse(secret)).not.toThrow();
		});

		it("rejects invalid secret JSON", () => {
			const invalidSecret = {
				encoded: "encoded",
			};

			expect(() => PolkadotSecretJSONSpec.parse(invalidSecret)).toThrow();
		});
	});

	describe("ProsopoBasicConfigSchema", () => {
		it("validates basic config", () => {
			const config = {
				account: {},
				database: {
					development: {
						type: "mongo",
						endpoint: "mongodb://localhost:27017",
					},
				},
			};

			expect(() => ProsopoBasicConfigSchema.parse(config)).not.toThrow();
		});
	});

	describe("ProsopoApiConfigSchema", () => {
		it("validates API config with defaults", () => {
			// baseURL is required, defaults are applied via .default() but still need to provide baseURL
			const config = {
				baseURL: "http://localhost",
			};

			const result = ProsopoApiConfigSchema.parse(config);
			expect(result.baseURL).toBe("http://localhost");
			expect(result.port).toBe(9229);
		});

		it("validates API config with custom values", () => {
			const config = {
				baseURL: "https://api.example.com",
				port: 8080,
			};

			const result = ProsopoApiConfigSchema.parse(config);
			expect(result.baseURL).toBe("https://api.example.com");
			expect(result.port).toBe(8080);
		});

		it("rejects invalid URL", () => {
			const config = {
				baseURL: "not-a-url",
			};

			expect(() => ProsopoApiConfigSchema.parse(config)).toThrow();
		});
	});

	describe("ProsopoCaptchaSolutionConfigSchema", () => {
		it("validates captcha solution config", () => {
			const config = {
				requiredNumberOfSolutions: 2,
				solutionWinningPercentage: 80,
				captchaBlockRecency: 2,
			};

			expect(() =>
				ProsopoCaptchaSolutionConfigSchema.parse(config),
			).not.toThrow();
		});

		it("rejects config with invalid values", () => {
			const config = {
				requiredNumberOfSolutions: 1,
				solutionWinningPercentage: 101,
				captchaBlockRecency: 1,
			};

			expect(() => ProsopoCaptchaSolutionConfigSchema.parse(config)).toThrow();
		});
	});

	describe("ProsopoClientConfigSchema", () => {
		it("validates client config with defaults", () => {
			const config = {
				account: {},
			};

			const result = ProsopoClientConfigSchema.parse(config);
			expect(result.web2).toBe(true);
			expect(result.solutionThreshold).toBe(80);
			expect(result.dappName).toBe("ProsopoClientDapp");
		});

		it("validates client config with custom values", () => {
			const config = {
				account: {},
				userAccountAddress: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
				web2: false,
				solutionThreshold: 90,
				dappName: "CustomDapp",
			};

			const result = ProsopoClientConfigSchema.parse(config);
			expect(result.userAccountAddress).toBe(
				"5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
			);
			expect(result.web2).toBe(false);
			expect(result.solutionThreshold).toBe(90);
			expect(result.dappName).toBe("CustomDapp");
		});
	});

	describe("CaptchaTimeoutSchema", () => {
		it("validates timeout config with defaults", () => {
			const config = {};

			const result = CaptchaTimeoutSchema.parse(config);
			expect(result.image.challengeTimeout).toBe(DEFAULT_IMAGE_CAPTCHA_TIMEOUT);
			expect(result.image.solutionTimeout).toBe(
				DEFAULT_IMAGE_CAPTCHA_SOLUTION_TIMEOUT,
			);
			expect(result.image.verifiedTimeout).toBe(
				DEFAULT_IMAGE_CAPTCHA_VERIFIED_TIMEOUT,
			);
			expect(result.image.cachedTimeout).toBe(
				DEFAULT_IMAGE_MAX_VERIFIED_TIME_CACHED,
			);
			expect(result.pow.verifiedTimeout).toBe(
				DEFAULT_POW_CAPTCHA_VERIFIED_TIMEOUT,
			);
			expect(result.pow.solutionTimeout).toBe(
				DEFAULT_POW_CAPTCHA_SOLUTION_TIMEOUT,
			);
			expect(result.pow.cachedTimeout).toBe(DEFAULT_POW_CAPTCHA_CACHED_TIMEOUT);
			expect(result.contract.maxVerifiedTime).toBe(
				DEFAULT_MAX_VERIFIED_TIME_CONTRACT,
			);
		});

		it("validates timeout config with custom values", () => {
			const config = {
				image: {
					challengeTimeout: 120000,
					solutionTimeout: 240000,
				},
			};

			const result = CaptchaTimeoutSchema.parse(config);
			expect(result.image.challengeTimeout).toBe(120000);
			expect(result.image.solutionTimeout).toBe(240000);
		});
	});

	describe("AccountCreatorConfigSchema", () => {
		it("validates account creator config", () => {
			const config = {
				area: {
					width: 100,
					height: 100,
				},
				offsetParameter: 10,
				multiplier: 2,
				fontSizeFactor: 1.5,
				maxShadowBlur: 5,
				numberOfRounds: 3,
				seed: 12345,
			};

			expect(() => AccountCreatorConfigSchema.parse(config)).not.toThrow();
		});

		it("rejects config with non-positive values", () => {
			const config = {
				area: {
					width: -100,
					height: 100,
				},
				offsetParameter: 10,
				multiplier: 2,
				fontSizeFactor: 1.5,
				maxShadowBlur: 5,
				numberOfRounds: 3,
				seed: 12345,
			};

			expect(() => AccountCreatorConfigSchema.parse(config)).toThrow();
		});
	});

	describe("Mode enum", () => {
		it("has correct enum values", () => {
			expect(ModeEnum.visible).toBe("visible");
			expect(ModeEnum.invisible).toBe("invisible");
		});
	});

	describe("Mode schema", () => {
		it("validates visible mode", () => {
			expect(() => Mode.parse(ModeEnum.visible)).not.toThrow();
		});

		it("validates invisible mode", () => {
			expect(() => Mode.parse(ModeEnum.invisible)).not.toThrow();
		});

		it("validates undefined mode", () => {
			expect(() => Mode.parse(undefined)).not.toThrow();
		});

		it("rejects invalid mode", () => {
			expect(() => Mode.parse("invalid")).toThrow();
		});
	});

	describe("ProcaptchaConfigSchema", () => {
		it("validates procaptcha config with defaults", () => {
			const config = {
				account: {},
			};

			const result = ProcaptchaConfigSchema.parse(config);
			expect(result.theme).toBe("light");
			expect(result.mode).toBe(ModeEnum.visible);
		});

		it("validates procaptcha config with custom values", () => {
			const config = {
				account: {},
				theme: "dark",
				mode: ModeEnum.invisible,
				language: "en",
			};

			const result = ProcaptchaConfigSchema.parse(config);
			expect(result.theme).toBe("dark");
			expect(result.mode).toBe(ModeEnum.invisible);
			expect(result.language).toBe("en");
		});
	});

	describe("IpApiServiceSpec", () => {
		it("validates IP API service config", () => {
			const config = {
				apiKey: "test-key",
				baseUrl: "https://api.example.com",
			};

			expect(() => IpApiServiceSpec.parse(config)).not.toThrow();
		});

		it("rejects invalid URL", () => {
			const config = {
				apiKey: "test-key",
				baseUrl: "not-a-url",
			};

			expect(() => IpApiServiceSpec.parse(config)).toThrow();
		});
	});

	describe("ProsopoConfigSchema", () => {
		it("validates prosopo config with required fields", () => {
			const config = {
				account: {},
				host: "example.com",
				ipApi: {
					apiKey: "test-key",
					baseUrl: "https://api.example.com",
				},
				authAccount: {},
			};

			expect(() => ProsopoConfigSchema.parse(config)).not.toThrow();
		});

		it("validates prosopo config with defaults", () => {
			const config = {
				account: {},
				host: "example.com",
				ipApi: {
					apiKey: "test-key",
					baseUrl: "https://api.example.com",
				},
				authAccount: {},
			};

			const result = ProsopoConfigSchema.parse(config);
			expect(result.redisConnection.url).toBe("redis://localhost:6379");
			expect(result.redisConnection.password).toBe("root");
		});
	});
});
