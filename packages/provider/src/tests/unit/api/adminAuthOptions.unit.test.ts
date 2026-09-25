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
import {
	DEFAULT_ADMIN_JWT_MAX_LIFETIME_SECONDS,
	adminAuthOptions,
} from "../../../api/adminAuthOptions.js";

describe("adminAuthOptions", () => {
	it("binds tokens to the provider host by default without requiring aud", () => {
		const { verify, replayGuard } = adminAuthOptions({}, "pronode1.prosopo.io");
		expect(verify).toEqual({
			audience: ["pronode1.prosopo.io", "https://pronode1.prosopo.io"],
			requireAudience: false,
			maxLifetimeSeconds: DEFAULT_ADMIN_JWT_MAX_LIFETIME_SECONDS,
		});
		expect(replayGuard).toBeDefined();
	});

	it("uses the configured audience list over the host", () => {
		const { verify } = adminAuthOptions(
			{
				PROSOPO_ADMIN_JWT_AUDIENCE: " https://a.example , b.example ,",
				PROSOPO_ADMIN_JWT_REQUIRE_AUDIENCE: "true",
				PROSOPO_ADMIN_JWT_MAX_LIFETIME_SECONDS: "600",
			},
			"pronode1.prosopo.io",
		);
		expect(verify).toEqual({
			audience: ["https://a.example", "b.example"],
			requireAudience: true,
			maxLifetimeSeconds: 600,
		});
	});

	it("skips the audience check when there is nothing to bind to", () => {
		expect(adminAuthOptions({}, "").verify?.audience).toBeUndefined();
	});

	it("fails closed when an audience is required but none is known", () => {
		const { verify } = adminAuthOptions(
			{ PROSOPO_ADMIN_JWT_REQUIRE_AUDIENCE: "true" },
			undefined,
		);
		expect(verify?.audience).toEqual([]);
		expect(verify?.requireAudience).toBe(true);
	});

	it("ignores an unusable max lifetime", () => {
		expect(
			adminAuthOptions({ PROSOPO_ADMIN_JWT_MAX_LIFETIME_SECONDS: "abc" }, "h")
				.verify?.maxLifetimeSeconds,
		).toBe(DEFAULT_ADMIN_JWT_MAX_LIFETIME_SECONDS);
	});
});
