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

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getServerConfig, getServerUrl } from "../config.js";

const ENV_KEYS = [
	"PROSOPO_SERVER_URL",
	"PROSOPO_SERVER_PORT",
	"PROSOPO_DEFAULT_ENVIRONMENT",
	"PROSOPO_DAPP_NAME",
	"PROSOPO_SITE_KEY",
	"PROSOPO_SITE_PRIVATE_KEY",
] as const;

const saved = new Map<string, string | undefined>();

beforeEach(() => {
	for (const key of ENV_KEYS) {
		saved.set(key, process.env[key]);
		delete process.env[key];
	}
});

afterEach(() => {
	for (const key of ENV_KEYS) {
		const value = saved.get(key);
		if (undefined === value) {
			delete process.env[key];
		} else {
			process.env[key] = value;
		}
	}
});

describe("getServerUrl", () => {
	it("falls back to localhost when no server url is configured", () => {
		expect(getServerUrl()).toBe("https://localhost:9228");
	});

	it("returns a url that already carries a port unchanged", () => {
		process.env.PROSOPO_SERVER_URL = "https://provider.test:8080";

		expect(getServerUrl()).toBe("https://provider.test:8080");
	});

	it("appends the configured port to a portless url", () => {
		process.env.PROSOPO_SERVER_URL = "https://provider.test";
		process.env.PROSOPO_SERVER_PORT = "1234";

		expect(getServerUrl()).toBe("https://provider.test:1234");
	});

	it("appends the default port when only the url is set", () => {
		process.env.PROSOPO_SERVER_URL = "https://provider.test";

		expect(getServerUrl()).toBe("https://provider.test:9228");
	});

	it("treats an empty server url as absent", () => {
		process.env.PROSOPO_SERVER_URL = "";

		expect(getServerUrl()).toBe("https://localhost:9228");
	});

	it("appends the default port when the port is an empty string", () => {
		process.env.PROSOPO_SERVER_URL = "https://provider.test";
		process.env.PROSOPO_SERVER_PORT = "";

		expect(getServerUrl()).toBe("https://provider.test:9228");
	});
});

describe("getServerConfig", () => {
	it("builds a config from the environment", () => {
		process.env.PROSOPO_DEFAULT_ENVIRONMENT = "development";
		process.env.PROSOPO_DAPP_NAME = "my-dapp";
		process.env.PROSOPO_SITE_KEY = "site-key";
		process.env.PROSOPO_SITE_PRIVATE_KEY = "site-secret";
		process.env.PROSOPO_SERVER_URL = "https://provider.test:8080";

		const config = getServerConfig();

		expect(config.defaultEnvironment).toBe("development");
		expect(config.dappName).toBe("my-dapp");
		expect(config.serverUrl).toBe("https://provider.test:8080");
		expect(config.account).toMatchObject({
			address: "site-key",
			secret: "site-secret",
			password: "",
		});
	});

	it("defaults the dapp name when none is configured", () => {
		expect(getServerConfig().dappName).toBe("client-example-server");
	});

	it("defaults the account fields to empty strings", () => {
		expect(getServerConfig().account).toMatchObject({
			address: "",
			secret: "",
		});
	});

	it("rejects an unknown default environment", () => {
		process.env.PROSOPO_DEFAULT_ENVIRONMENT = "not-an-environment";

		expect(() => getServerConfig()).toThrow();
	});
});
