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

import { ApiEndpointResponseStatus } from "@prosopo/api-route";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { accessRuleApiPaths } from "#policy/api/ruleApiPaths.js";
import { AccessRulesApiClient } from "#policy/api/rulesApiClient.js";

type SentRequest = { url: string; body: unknown; headers: HeadersInit };

const baseUrl = "https://provider.test";
const siteKey = "site-key";
const jwt = "token";

describe("AccessRulesApiClient", () => {
	let sent: SentRequest[];
	let replyBody: unknown;

	beforeEach(() => {
		sent = [];
		replyBody = { status: ApiEndpointResponseStatus.SUCCESS };
		vi.stubGlobal(
			"fetch",
			vi.fn(async (url: string, init: RequestInit): Promise<Response> => {
				sent.push({
					url,
					body: JSON.parse(String(init.body)),
					headers: init.headers ?? {},
				});
				return new Response(JSON.stringify(replyBody), {
					headers: { "content-type": "application/json" },
				});
			}),
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	const client = (): AccessRulesApiClient =>
		new AccessRulesApiClient(baseUrl, siteKey);

	it.each([
		{
			name: "deleteMany",
			call: (c: AccessRulesApiClient) => c.deleteMany([], jwt),
			path: accessRuleApiPaths.DELETE_MANY,
			body: [],
		},
		{
			name: "deleteGroups",
			call: (c: AccessRulesApiClient) =>
				c.deleteGroups([{ clientIds: ["a"], groupId: "g" }], jwt),
			path: accessRuleApiPaths.DELETE_GROUPS,
			body: [{ clientIds: ["a"], groupId: "g" }],
		},
		{
			name: "deleteAll",
			call: (c: AccessRulesApiClient) => c.deleteAll(jwt),
			path: accessRuleApiPaths.DELETE_ALL,
			body: {},
		},
		{
			name: "getMissingIds",
			call: (c: AccessRulesApiClient) => c.getMissingIds(["x"], jwt),
			path: accessRuleApiPaths.GET_MISSING_IDS,
			body: ["x"],
		},
		{
			name: "fetchMany",
			call: (c: AccessRulesApiClient) => c.fetchMany({ ids: ["x"] }, jwt),
			path: accessRuleApiPaths.FETCH_MANY,
			body: { ids: ["x"] },
		},
		{
			name: "findIds",
			call: (c: AccessRulesApiClient) => c.findIds([], jwt),
			path: accessRuleApiPaths.FIND_IDS,
			body: [],
		},
		{
			name: "rehashAll",
			call: (c: AccessRulesApiClient) => c.rehashAll(jwt),
			path: accessRuleApiPaths.REHASH_ALL,
			body: {},
		},
		{
			name: "insertMany",
			call: (c: AccessRulesApiClient) => c.insertMany([], jwt),
			path: accessRuleApiPaths.INSERT_MANY,
			body: [],
		},
	])(
		"$name posts its body to $path with auth headers",
		async ({ call, path, body }) => {
			await call(client());

			expect(sent).toHaveLength(1);
			expect(sent[0]?.url).toBe(`${baseUrl}${path}`);
			expect(sent[0]?.body).toEqual(body);
			expect(sent[0]?.headers).toMatchObject({
				"Prosopo-Site-Key": siteKey,
				Authorization: `Bearer ${jwt}`,
			});
		},
	);

	it("passes through data that matches the response contract", async () => {
		replyBody = {
			status: ApiEndpointResponseStatus.SUCCESS,
			data: { ids: ["a"] },
		};

		await expect(client().getMissingIds(["a"], jwt)).resolves.toEqual({
			status: ApiEndpointResponseStatus.SUCCESS,
			data: { ids: ["a"] },
		});
	});

	it("drops data that breaks the response contract but keeps the envelope", async () => {
		replyBody = {
			status: ApiEndpointResponseStatus.FAIL,
			data: { ruleIds: "not-an-array" },
			error: "boom",
		};

		await expect(client().findIds([], jwt)).resolves.toEqual({
			status: ApiEndpointResponseStatus.FAIL,
			data: undefined,
			error: "boom",
		});
	});
});
