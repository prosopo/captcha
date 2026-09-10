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

import { afterEach, describe, expect, it } from "vitest";
import {
	DEFAULT_DEVELOPMENT_PROVIDER_URL,
	getDevelopmentProviderUrl,
	readDevelopmentProviderUrlOverride,
} from "../developmentProviderUrl.js";

const ENV_KEY = "PROSOPO_PROVIDER_URL_DEVELOPMENT";
const original: string | undefined = process.env[ENV_KEY];

afterEach(() => {
	if (original === undefined) delete process.env[ENV_KEY];
	else process.env[ENV_KEY] = original;
});

describe("the development provider url", () => {
	it("is localhost when nothing overrides it", () => {
		expect(getDevelopmentProviderUrl(undefined)).toBe(
			"https://localhost:9229",
		);
		expect(DEFAULT_DEVELOPMENT_PROVIDER_URL).toBe("https://localhost:9229");
	});

	it("is the override when one is set", () => {
		// The case this exists for: a phone loading the demo over the LAN cannot
		// reach the provider via `localhost`, which resolves to the phone.
		expect(getDevelopmentProviderUrl("https://192.168.1.15:9229")).toBe(
			"https://192.168.1.15:9229",
		);
	});

	it("drops a trailing slash so the url composes with /healthz", () => {
		expect(getDevelopmentProviderUrl("https://192.168.1.15:9229/")).toBe(
			"https://192.168.1.15:9229",
		);
	});

	it("falls back rather than yielding an empty url", () => {
		for (const blank of ["", "   ", undefined]) {
			expect(getDevelopmentProviderUrl(blank)).toBe(
				DEFAULT_DEVELOPMENT_PROVIDER_URL,
			);
		}
	});
});

describe("reading the override", () => {
	it("reads the environment variable", () => {
		process.env[ENV_KEY] = "https://10.0.2.2:9229";
		expect(readDevelopmentProviderUrlOverride()).toBe("https://10.0.2.2:9229");
	});

	it("is undefined when the variable is unset", () => {
		delete process.env[ENV_KEY];
		expect(readDevelopmentProviderUrlOverride()).toBeUndefined();
	});

	it("defaults when the variable is unset", () => {
		delete process.env[ENV_KEY];
		expect(getDevelopmentProviderUrl()).toBe(DEFAULT_DEVELOPMENT_PROVIDER_URL);
	});
});
