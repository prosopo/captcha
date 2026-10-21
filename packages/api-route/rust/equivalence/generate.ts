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

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import type {
	ApiRouteLimit,
	ApiRouteLimits,
	ApiRoutes,
} from "../../src/apiRoutes.js";
import type { ApiEndpoint } from "../../src/endpoint/apiEndpoint.js";
import type { ApiEndpointResponse } from "../../src/endpoint/apiEndpointResponse.js";
import { ApiEndpointResponseStatus } from "../../src/endpoint/apiEndpointResponseStatus.js";

// The vectors are what Node 24, the production runtime, produces.
if (!process.version.startsWith("v24.")) {
	throw new Error(`this generator must run on Node 24 (the production runtime), not ${process.version}`);
}

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

// JSON has no `undefined`, so an absent request body travels as a missing `input`.
type ParseCase = { input?: Json };

type ParseVector = ParseCase &
	(
		| { success: true; output: Json; response: Json }
		| { success: false; issues: Json; message: string; errorJson: string }
	);

type ResponseVector = { response: ApiEndpointResponse; json: string };

type LimitsVector = {
	limits: { [key: string]: ApiRouteLimit };
	keys: string[];
	json: string;
};

const toJson = (value: unknown): Json =>
	JSON.parse(JSON.stringify(value)) as Json;

const siteKeySchema = z.object({ siteKey: z.string() });

const endpointWithArgs: ApiEndpoint<typeof siteKeySchema> = {
	getRequestArgsSchema: () => siteKeySchema,
	processRequest: async (
		args: z.infer<typeof siteKeySchema>,
	): Promise<ApiEndpointResponse> => ({
		status: ApiEndpointResponseStatus.SUCCESS,
		data: { siteKey: args.siteKey },
	}),
};

const endpointWithoutArgs: ApiEndpoint<undefined> = {
	getRequestArgsSchema: () => undefined,
	processRequest: async (): Promise<ApiEndpointResponse> => ({
		status: ApiEndpointResponseStatus.SUCCESS,
	}),
};

const throwingEndpoint: ApiEndpoint<undefined> = {
	getRequestArgsSchema: () => undefined,
	processRequest: async (): Promise<ApiEndpointResponse> => {
		throw new Error("boom");
	},
};

const parseCases: ParseCase[] = [
	{ input: { siteKey: "abc" } },
	{ input: { siteKey: "" } },
	{ input: { siteKey: "5C4hrfjw9DjXZTzV3MwzrrAr9P1MJhSrvWGWqi1eSuyUpnhM" } },
	{ input: { siteKey: "unicode é中😀" } },
	{ input: { siteKey: "abc", extra: 1, nested: { a: [1, 2] } } },
	{ input: { extra: "abc", siteKey: "def" } },
	{ input: {} },
	{ input: { sitekey: "abc" } },
	{ input: { siteKey: null } },
	{ input: { siteKey: 1 } },
	{ input: { siteKey: 1.5 } },
	{ input: { siteKey: true } },
	{ input: { siteKey: false } },
	{ input: { siteKey: [] } },
	{ input: { siteKey: ["abc"] } },
	{ input: { siteKey: {} } },
	{},
	{ input: null },
	{ input: [] },
	{ input: [{ siteKey: "abc" }] },
	{ input: "abc" },
	{ input: "" },
	{ input: 0 },
	{ input: -1 },
	{ input: true },
	{ input: false },
];

const runParseCase = async (parseCase: ParseCase): Promise<ParseVector> => {
	const parsed = endpointWithArgs
		.getRequestArgsSchema()
		.safeParse(parseCase.input);
	if (parsed.success) {
		const response = await endpointWithArgs.processRequest(parsed.data);
		return {
			...parseCase,
			success: true,
			output: toJson(parsed.data),
			response: toJson(response),
		};
	}
	return {
		...parseCase,
		success: false,
		issues: toJson(parsed.error.issues),
		message: parsed.error.message,
		errorJson: JSON.stringify(parsed.error),
	};
};

const responses: ApiEndpointResponse[] = [
	{ status: ApiEndpointResponseStatus.SUCCESS },
	{ status: ApiEndpointResponseStatus.FAIL },
	{ status: ApiEndpointResponseStatus.PROCESSING },
	{ status: ApiEndpointResponseStatus.SUCCESS, data: {} },
	{ status: ApiEndpointResponseStatus.SUCCESS, data: { deleted_count: 0 } },
	{
		status: ApiEndpointResponseStatus.SUCCESS,
		data: { b: 1, a: "x", nested: { z: [1, "two", null, true], y: {} } },
	},
	{ status: ApiEndpointResponseStatus.SUCCESS, data: [1, 2, 3] },
	{ status: ApiEndpointResponseStatus.SUCCESS, data: [] },
	{ status: ApiEndpointResponseStatus.FAIL, error: "boom" },
	{ status: ApiEndpointResponseStatus.FAIL, error: "" },
	{
		status: ApiEndpointResponseStatus.FAIL,
		error: 'quote " backslash \\ newline \n tab \t \u0001 é 😀',
	},
	{
		status: ApiEndpointResponseStatus.FAIL,
		data: { partial: true },
		error: "partial failure",
	},
	{ status: ApiEndpointResponseStatus.PROCESSING, data: { jobId: "123" } },
	{
		status: ApiEndpointResponseStatus.SUCCESS,
		data: { big: 9007199254740991, neg: -42, frac: 0.25 },
	},
];

const toResponseVector = (response: ApiEndpointResponse): ResponseVector => ({
	response,
	json: JSON.stringify(response),
});

const toLimitsVector = (limits: {
	[key: string]: ApiRouteLimit;
}): LimitsVector => ({
	limits,
	keys: Object.keys(limits),
	json: JSON.stringify(limits),
});

enum Route {
	Verify = "verify",
	Submit = "submit",
}

const stringLimits: ApiRouteLimits<Route> = {
	[Route.Verify]: { windowMs: 1000, limit: 5 },
	[Route.Submit]: { windowMs: 60_000, limit: 100 },
};

const numericLimits: ApiRouteLimits<10 | 2 | 0> = {
	10: { windowMs: 1000, limit: 5 },
	2: { windowMs: 2000, limit: 6 },
	0: { windowMs: 3000, limit: 7 },
};

const mixedLimits: ApiRouteLimits<"/v1/b" | "1" | "/v1/a" | "01"> = {
	"/v1/b": { windowMs: 10_000, limit: 5 },
	"1": { windowMs: 1, limit: 1 },
	"/v1/a": { windowMs: 0, limit: 0 },
	"01": { windowMs: 2, limit: 2 },
};

const routes: ApiRoutes = {
	"/without": endpointWithoutArgs,
	"/with": endpointWithArgs,
	"/throwing": throwingEndpoint,
};

const main = async (): Promise<void> => {
	const parse: ParseVector[] = [];
	for (const parseCase of parseCases) {
		parse.push(await runParseCase(parseCase));
	}

	const noArgsResponse = await endpointWithoutArgs.processRequest();
	let thrownMessage = "";
	try {
		await throwingEndpoint.processRequest();
	} catch (error) {
		thrownMessage = error instanceof Error ? error.message : String(error);
	}

	const data = {
		status: {
			keys: Object.keys(ApiEndpointResponseStatus),
			values: Object.values(ApiEndpointResponseStatus),
		},
		responses: responses.map(toResponseVector),
		parse,
		noArgs: {
			schemaIsUndefined:
				endpointWithoutArgs.getRequestArgsSchema() === undefined,
			response: toJson(noArgsResponse),
			json: JSON.stringify(noArgsResponse),
		},
		throwing: { message: thrownMessage },
		routes: { keys: Object.keys(routes) },
		limits: [stringLimits, numericLimits, mixedLimits].map(toLimitsVector),
	};

	writeFileSync(
		fileURLToPath(new URL("./vectors.json", import.meta.url)),
		`${JSON.stringify(data, null, "\t")}\n`,
	);
};

await main();
