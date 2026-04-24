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

import { describe, expect, it } from "vitest";
import { getRandomActiveProvider } from "../providers.js";

describe("getRandomActiveProvider", () => {
	it("returns localhost for development environment", async () => {
		const result = await getRandomActiveProvider("development");

		expect(result.providerAccount).toBe("dns-load-balanced-provider");
		expect(result.provider.url).toBe("http://localhost:9229");
		expect(result.provider).not.toHaveProperty("datasetId");
	});

	it("returns DNS-based URL for staging environment", async () => {
		const result = await getRandomActiveProvider("staging");

		expect(result.providerAccount).toBe("dns-load-balanced-provider");
		expect(result.provider.url).toBe("https://staging.pronode.prosopo.io");
		expect(result.provider).not.toHaveProperty("datasetId");
	});

	it("returns DNS-based URL for production environment", async () => {
		const result = await getRandomActiveProvider("production");

		expect(result.providerAccount).toBe("dns-load-balanced-provider");
		expect(result.provider.url).toBe("https://pronode.prosopo.io");
		expect(result.provider).not.toHaveProperty("datasetId");
	});

	it("returns consistent results when called multiple times", async () => {
		const result1 = await getRandomActiveProvider("staging");
		const result2 = await getRandomActiveProvider("staging");

		expect(result1.provider.url).toBe(result2.provider.url);
		expect(result1.providerAccount).toBe(result2.providerAccount);
	});
});
