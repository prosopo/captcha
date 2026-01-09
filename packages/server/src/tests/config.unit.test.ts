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

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getServerConfig, getServerUrl } from "../config.js";

describe("getServerUrl", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		vi.resetModules();
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it("returns default localhost URL when PROSOPO_SERVER_URL is not set", () => {
		process.env.PROSOPO_SERVER_URL = undefined;
		process.env.PROSOPO_SERVER_PORT = undefined;
		const url = getServerUrl();
		expect(url).toBe("http://localhost:9228");
	});

	it("returns URL with port when PROSOPO_SERVER_URL is set without port", () => {
		process.env.PROSOPO_SERVER_URL = "http://example.com";
		process.env.PROSOPO_SERVER_PORT = "8080";
		const url = getServerUrl();
		expect(url).toBe("http://example.com:8080");
	});

	it("returns URL with default port 9228 when PROSOPO_SERVER_URL is set without port and PROSOPO_SERVER_PORT is not set", () => {
		process.env.PROSOPO_SERVER_URL = "http://example.com";
		process.env.PROSOPO_SERVER_PORT = undefined;
		const url = getServerUrl();
		expect(url).toBe("http://example.com:9228");
	});

	it("returns URL as-is when PROSOPO_SERVER_URL already contains a port", () => {
		process.env.PROSOPO_SERVER_URL = "http://example.com:3000";
		const url = getServerUrl();
		expect(url).toBe("http://example.com:3000");
	});

	it("returns URL as-is when PROSOPO_SERVER_URL already contains a port, ignoring PROSOPO_SERVER_PORT", () => {
		process.env.PROSOPO_SERVER_URL = "http://example.com:3000";
		process.env.PROSOPO_SERVER_PORT = "8080";
		const url = getServerUrl();
		expect(url).toBe("http://example.com:3000");
	});

	it("handles HTTPS URLs correctly", () => {
		process.env.PROSOPO_SERVER_URL = "https://example.com";
		process.env.PROSOPO_SERVER_PORT = "443";
		const url = getServerUrl();
		expect(url).toBe("https://example.com:443");
	});
});

describe("getServerConfig", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		vi.resetModules();
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it("returns config with default dappName when PROSOPO_DAPP_NAME is not set", () => {
		process.env.PROSOPO_DAPP_NAME = undefined;
		process.env.PROSOPO_SITE_KEY = undefined;
		process.env.PROSOPO_SITE_PRIVATE_KEY = undefined;
		process.env.PROSOPO_DEFAULT_ENVIRONMENT = undefined;
		process.env.PROSOPO_SERVER_URL = undefined;
		process.env.PROSOPO_SERVER_PORT = undefined;

		const config = getServerConfig();
		expect(config.dappName).toBe("client-example-server");
		expect(config.account.address).toBe("");
		expect(config.account.secret).toBe("");
		expect(config.serverUrl).toBe("http://localhost:9228");
	});

	it("returns config with custom dappName when PROSOPO_DAPP_NAME is set", () => {
		process.env.PROSOPO_DAPP_NAME = "my-custom-app";
		process.env.PROSOPO_SITE_KEY =
			"5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
		process.env.PROSOPO_SITE_PRIVATE_KEY = "0x1234567890abcdef";
		process.env.PROSOPO_DEFAULT_ENVIRONMENT = "development";
		process.env.PROSOPO_SERVER_URL = undefined;
		process.env.PROSOPO_SERVER_PORT = undefined;

		const config = getServerConfig();
		expect(config.dappName).toBe("my-custom-app");
		expect(config.account.address).toBe(
			"5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
		);
		expect(config.account.secret).toBe("0x1234567890abcdef");
		expect(config.defaultEnvironment).toBe("development");
	});

	it("returns config with custom server URL when PROSOPO_SERVER_URL is set", () => {
		process.env.PROSOPO_DAPP_NAME = "test-app";
		process.env.PROSOPO_SITE_KEY =
			"5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
		process.env.PROSOPO_SITE_PRIVATE_KEY = "0x1234567890abcdef";
		process.env.PROSOPO_DEFAULT_ENVIRONMENT = "production";
		process.env.PROSOPO_SERVER_URL = "https://api.example.com";
		process.env.PROSOPO_SERVER_PORT = "443";

		const config = getServerConfig();
		expect(config.serverUrl).toBe("https://api.example.com:443");
	});

	it("returns config with server URL containing port when PROSOPO_SERVER_URL already has port", () => {
		process.env.PROSOPO_DAPP_NAME = "test-app";
		process.env.PROSOPO_SITE_KEY =
			"5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
		process.env.PROSOPO_SITE_PRIVATE_KEY = "0x1234567890abcdef";
		process.env.PROSOPO_DEFAULT_ENVIRONMENT = "staging";
		process.env.PROSOPO_SERVER_URL = "https://api.example.com:8080";

		const config = getServerConfig();
		expect(config.serverUrl).toBe("https://api.example.com:8080");
	});
});
