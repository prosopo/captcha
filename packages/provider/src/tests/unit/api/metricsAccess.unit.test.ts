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

import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import type { ProviderEnvironment } from "@prosopo/env";
import express, { type Request } from "express";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { metricsAccess, metricsHandler } from "../../../api/metrics.js";

const ENV_KEYS = ["PROSOPO_METRICS_TOKEN", "PROSOPO_METRICS_PUBLIC"] as const;
const saved = ENV_KEYS.map((key) => [key, process.env[key]] as const);

const restore = (): void => {
	for (const [key, value] of saved) {
		if (value === undefined) delete process.env[key];
		else process.env[key] = value;
	}
};

describe("GET /metrics over HTTP", () => {
	let server: Server;
	let url: string;

	beforeAll(async () => {
		for (const key of ENV_KEYS) delete process.env[key];
		const env: Partial<ProviderEnvironment> = {
			getDb: () => {
				throw new Error("no db in this test");
			},
		};
		const app = express();
		app.get("/metrics", metricsHandler(env as ProviderEnvironment));
		server = app.listen(0, "127.0.0.1");
		await new Promise<void>((resolve) => server.once("listening", resolve));
		const address: AddressInfo | string | null = server.address();
		if (address === null || typeof address === "string")
			throw new Error("test server has no TCP address");
		url = `http://127.0.0.1:${address.port}/metrics`;
	});

	afterEach(() => {
		for (const key of ENV_KEYS) delete process.env[key];
	});

	afterAll(async () => {
		restore();
		await new Promise<void>((resolve) => server.close(() => resolve()));
	});

	const get = async (headers: Record<string, string> = {}): Promise<number> =>
		(await fetch(url, { headers })).status;

	it("serves a direct scrape from the internal network", async () => {
		expect(await get()).toBe(200);
	});

	it("refuses a scrape relayed by a reverse proxy", async () => {
		// Behind Caddy the socket peer is the proxy's own private address; the
		// forwarding header is what shows the caller is outside.
		expect(await get({ "x-forwarded-for": "203.0.113.9" })).toBe(403);
		expect(await get({ forwarded: "for=203.0.113.9" })).toBe(403);
	});

	it("requires the token from everyone once one is configured", async () => {
		process.env.PROSOPO_METRICS_TOKEN = "s3cret";
		expect(await get()).toBe(401);
		expect(await get({ authorization: "Bearer wrong!" })).toBe(401);
		expect(
			await get({
				authorization: "Bearer s3cret",
				"x-forwarded-for": "203.0.113.9",
			}),
		).toBe(200);
	});

	it("can be opened up again explicitly", async () => {
		process.env.PROSOPO_METRICS_PUBLIC = "true";
		expect(await get({ "x-forwarded-for": "203.0.113.9" })).toBe(200);
	});
});

describe("metricsAccess", () => {
	const from = (remoteAddress: string): Request => {
		const partial: Partial<Request> = {
			headers: {},
			socket: { remoteAddress } as Request["socket"],
		};
		return partial as Request;
	};

	it.each([
		"127.0.0.1",
		"10.1.2.3",
		"172.18.0.4",
		"192.168.0.238",
		"::1",
		"::ffff:172.18.0.4",
		"fd00::5",
	])("allows the internal address %s", (address) => {
		expect(metricsAccess(from(address), {})).toBe(200);
	});

	it.each(["203.0.113.9", "172.32.0.1", "::ffff:8.8.8.8", "2001:db8::1"])(
		"refuses the public address %s",
		(address) => {
			expect(metricsAccess(from(address), {})).toBe(403);
		},
	);
});
