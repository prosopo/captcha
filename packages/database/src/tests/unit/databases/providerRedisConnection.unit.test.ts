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

import { LogLevel, getLogger } from "@prosopo/logger";
import { describe, expect, it } from "vitest";
import { ProviderDatabase } from "../../../databases/provider.js";

const unconnectedProviderDatabase = (): ProviderDatabase =>
	new ProviderDatabase({
		mongo: { url: "mongodb://127.0.0.1:27017", dbname: "prosopo" },
		logger: getLogger(LogLevel.enum.error, "providerRedisConnection.test"),
	});

describe("ProviderDatabase Redis connection getters", () => {
	it("names the general connection when it is missing", () => {
		expect(() => unconnectedProviderDatabase().getRedisConnection()).toThrow(
			"Redis connection undefined",
		);
	});

	it("names the access rules connection when it is missing", () => {
		expect(() =>
			unconnectedProviderDatabase().getRedisAccessRulesConnection(),
		).toThrow("Redis access rules connection undefined");
	});
});
