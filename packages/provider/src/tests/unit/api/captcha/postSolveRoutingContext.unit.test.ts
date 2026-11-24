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

import type { ClientRecord } from "@prosopo/types-database";
import type { Request } from "express";
import { describe, expect, it } from "vitest";
import { buildPostSolveRoutingContext } from "../../../../api/captcha/postSolveRoutingContext.js";
import type { AugmentedRequest } from "../../../../express.js";

const request = (): Request & AugmentedRequest =>
	({
		headers: { "user-agent": "Mozilla/5.0" },
		ip: "192.0.2.1",
	}) as unknown as Request & AugmentedRequest;

const client = (
	settings: ClientRecord["settings"],
): Pick<ClientRecord, "tier" | "settings"> =>
	({ settings }) as Pick<ClientRecord, "tier" | "settings">;

describe("buildPostSolveRoutingContext", () => {
	it("hands the site's profile to the routing pass", () => {
		const siteProfile: Record<string, unknown> = { a: { b: 1 } };

		const ctx = buildPostSolveRoutingContext(
			request(),
			client({ siteProfile } as ClientRecord["settings"]),
		);

		expect(ctx.raw.siteProfile).toEqual(siteProfile);
	});

	it("leaves the profile out when the site has none", () => {
		const ctx = buildPostSolveRoutingContext(
			request(),
			client({} as ClientRecord["settings"]),
		);

		expect(ctx.raw).not.toHaveProperty("siteProfile");
	});
});
