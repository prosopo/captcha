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
import { type ProviderDetails, providerDetailsSchema } from "./api.js";

describe("providerDetailsSchema", () => {
	const redis: ProviderDetails["redis"] = [
		{ actor: "General", isReady: true, awaitingTimeSeconds: 0 },
	];

	it("accepts a host", () => {
		const parsed = providerDetailsSchema.parse({
			version: "1.0.0",
			message: "Provider online",
			host: "provider.example.com",
			redis,
		});

		expect(parsed.host).toBe("provider.example.com");
	});

	it("accepts a payload without a host, so a node that has not been upgraded still validates", () => {
		const parsed = providerDetailsSchema.parse({
			version: "1.0.0",
			message: "Provider online",
			redis,
		});

		expect(parsed.host).toBeUndefined();
	});

	it("rejects a non-string host", () => {
		const result = providerDetailsSchema.safeParse({
			version: "1.0.0",
			message: "Provider online",
			host: 1,
			redis,
		});

		expect(result.success).toBe(false);
	});
});
