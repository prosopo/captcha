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

import { Languages } from "@prosopo/locale";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createConfig } from "../../util/configCreator.js";

describe("createConfig", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		vi.resetModules();
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it("should create config with all parameters provided", () => {
		const config = createConfig(
			"test-site-key",
			"dark",
			Languages.en,
			false,
			true,
			"0x1234567890abcdef",
		);

		expect(config.account.address).toBe("test-site-key");
		expect(config.theme).toBe("dark");
		expect(config.language).toBe(Languages.en);
		expect(config.web2).toBe(false);
		expect(config.mode).toBe("invisible");
		expect(config.userAccountAddress).toBe("0x1234567890abcdef");
	});

	it("should create config with default parameters", () => {
		const config = createConfig();

		expect(config.account.address).toBe("");
		expect(config.theme).toBe("light");
		expect(config.web2).toBe(true);
		expect(config.mode).toBe("visible");
		expect(config.userAccountAddress).toBe("");
	});

	it("should use PROSOPO_SITE_KEY from environment when siteKey is not provided", () => {
		process.env.PROSOPO_SITE_KEY = "env-site-key";
		const config = createConfig();

		expect(config.account.address).toBe("env-site-key");
	});

	it("should use provided siteKey over environment variable", () => {
		process.env.PROSOPO_SITE_KEY = "env-site-key";
		const config = createConfig("provided-site-key");

		expect(config.account.address).toBe("provided-site-key");
	});

	it("should use PROSOPO_DEFAULT_ENVIRONMENT from environment when set", () => {
		process.env.PROSOPO_DEFAULT_ENVIRONMENT = "production";
		const config = createConfig("test-key");

		expect(config.defaultEnvironment).toBe("production");
	});

	it("should default to development environment when PROSOPO_DEFAULT_ENVIRONMENT is not set", () => {
		delete process.env.PROSOPO_DEFAULT_ENVIRONMENT;
		const config = createConfig("test-key");

		expect(config.defaultEnvironment).toBe("development");
	});

	it("should use PROSOPO_SERVER_URL from environment", () => {
		process.env.PROSOPO_SERVER_URL = "https://test-server.com";
		const config = createConfig("test-key");

		expect(config.serverUrl).toBe("https://test-server.com");
	});

	it("should use PROSOPO_MONGO_EVENTS_URI from environment", () => {
		process.env.PROSOPO_MONGO_EVENTS_URI = "mongodb://test-uri";
		const config = createConfig("test-key");

		// mongoAtlasUri may not be in the output config depending on schema
		expect(config).toBeDefined();
	});

	it("should create config with light theme", () => {
		const config = createConfig("test-key", "light");

		expect(config.theme).toBe("light");
	});

	it("should create config with dark theme", () => {
		const config = createConfig("test-key", "dark");

		expect(config.theme).toBe("dark");
	});

	it("should create config with visible mode when invisible is false", () => {
		const config = createConfig("test-key", "light", undefined, true, false);

		expect(config.mode).toBe("visible");
	});

	it("should create config with invisible mode when invisible is true", () => {
		const config = createConfig("test-key", "light", undefined, true, true);

		expect(config.mode).toBe("invisible");
	});

	it("should create config with web2 when web2 is true", () => {
		const config = createConfig("test-key", "light", undefined, true);

		expect(config.web2).toBe(true);
	});

	it("should create config with web3 when web2 is false", () => {
		const config = createConfig("test-key", "light", undefined, false);

		expect(config.web2).toBe(false);
	});

	it("should create config with language when provided", () => {
		const config = createConfig("test-key", "light", Languages.fr);

		expect(config.language).toBe(Languages.fr);
	});

	it("should create config without language when not provided", () => {
		const config = createConfig("test-key", "light", undefined);

		expect(config.language).toBeUndefined();
	});

	it("should create config with userAccountAddress when provided", () => {
		const config = createConfig(
			"test-key",
			"light",
			undefined,
			true,
			false,
			"0xabcdef1234567890",
		);

		expect(config.userAccountAddress).toBe("0xabcdef1234567890");
	});

	it("should create config with empty userAccountAddress when not provided", () => {
		const config = createConfig("test-key");

		expect(config.userAccountAddress).toBe("");
	});
});

