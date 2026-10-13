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

// domainMiddleware is the gate that ties a site key to the origins allowed to
// use it. These tests drive it through a real express app so the assertions
// are about what a caller actually gets back: whether the request reaches the
// route behind the gate, and with which status.

import http from "node:http";
import type { AddressInfo } from "node:net";
import { getLogger } from "@prosopo/logger";
import { ALWAYS_PASS_SITE_KEY, Tier } from "@prosopo/types";
import {
	type ClientRecord,
	ClientRecordSchema,
	type IProviderDatabase,
} from "@prosopo/types-database";
import type { ProviderEnvironment } from "@prosopo/types-env";
import express from "express";
import i18next, { type TFunction } from "i18next";
import mongoose from "mongoose";
import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { setMaintenanceMode } from "../../../api/admin/apiToggleMaintenanceModeEndpoint.js";
import { domainMiddleware } from "../../../api/domainMiddleware.js";
import type { ClientTaskManager } from "../../../tasks/client/clientTasks.js";
import { createMockProviderEnvironment } from "../testUtils/mockProviderEnv.js";

// The real Tasks wires up every task manager; the middleware only reads the
// client record and the domain matcher, so the stand-in builds just those —
// the matcher is the real ClientTaskManager implementation.
vi.mock("../../../tasks/index.js", async () => {
	const { ClientTaskManager: RealClientTaskManager } = await import(
		"../../../tasks/client/clientTasks.js"
	);
	class Tasks {
		db: IProviderDatabase;
		clientTaskManager: ClientTaskManager;
		constructor(env: ProviderEnvironment) {
			this.db = env.getDb();
			this.clientTaskManager = new RealClientTaskManager(
				env.config,
				env.logger,
				this.db,
			);
		}
	}
	return { Tasks };
});

const SITE_KEY = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";

const ClientModel = mongoose.model<ClientRecord>(
	"DomainMiddlewareTestClient",
	ClientRecordSchema,
);

const clientRecord = (domains: string[] | undefined): ClientRecord =>
	new ClientModel({
		account: SITE_KEY,
		tier: Tier.Free,
		settings: domains === undefined ? undefined : { domains },
	});

const getClientRecord = vi.fn<IProviderDatabase["getClientRecord"]>();

let server: http.Server;
let port: number;
let t: TFunction;

beforeAll(async () => {
	const i18n = i18next.createInstance();
	await i18n.init({ lng: "en", resources: {} });
	t = i18n.t;

	const env = createMockProviderEnvironment();
	const db = env.getDb();
	db.getClientRecord = getClientRecord;

	const app = express();
	app.use((req, _res, next) => {
		req.t = t;
		req.i18n = { t };
		req.logger = getLogger("error", "test:domain-middleware");
		next();
	});
	app.use(domainMiddleware(env));
	app.post("/", (_req, res) => {
		res.status(200).json({ reached: true });
	});

	server = http.createServer(app);
	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
	const address: AddressInfo | string | null = server.address();
	if (address === null || typeof address === "string") {
		throw new Error("test server did not bind a TCP port");
	}
	port = address.port;
});

afterAll(async () => {
	await new Promise<void>((resolve) => server.close(() => resolve()));
});

beforeEach(() => {
	setMaintenanceMode(false);
	getClientRecord.mockReset();
});

afterEach(() => {
	setMaintenanceMode(false);
});

interface GateResult {
	status: number;
	reached: boolean;
}

/**
 * POSTs to the gated route with exactly the given headers. node:http is used
 * rather than fetch because fetch decides the Origin header for itself.
 */
const send = (headers: Record<string, string>): Promise<GateResult> =>
	new Promise<GateResult>((resolve, reject) => {
		const req = http.request(
			{ host: "127.0.0.1", port, path: "/", method: "POST", headers },
			(res) => {
				let body = "";
				res.setEncoding("utf8");
				res.on("data", (chunk: string) => {
					body += chunk;
				});
				res.on("end", () => {
					resolve({
						status: res.statusCode ?? 0,
						reached: body.includes('"reached":true'),
					});
				});
			},
		);
		req.on("error", reject);
		req.end();
	});

const withKey = (origin?: string): Record<string, string> => ({
	"prosopo-site-key": SITE_KEY,
	...(origin === undefined ? {} : { origin }),
});

describe("domainMiddleware", () => {
	it("rejects a request without a site key", async () => {
		const result = await send({ origin: "https://example.com" });
		expect(result).toEqual({ status: 400, reached: false });
		expect(getClientRecord).not.toHaveBeenCalled();
	});

	it("rejects a malformed site key before touching the database", async () => {
		const result = await send({
			"prosopo-site-key": "not-an-address",
			origin: "https://example.com",
		});
		expect(result).toEqual({ status: 400, reached: false });
		expect(getClientRecord).not.toHaveBeenCalled();
	});

	it("lets a reserved test site key through from any origin", async () => {
		const result = await send({
			"prosopo-site-key": ALWAYS_PASS_SITE_KEY,
			origin: "https://anything.invalid",
		});
		expect(result).toEqual({ status: 200, reached: true });
		expect(getClientRecord).not.toHaveBeenCalled();
	});

	it("rejects a site key with no client record", async () => {
		getClientRecord.mockResolvedValue(undefined);
		const result = await send(withKey("https://example.com"));
		expect(result).toEqual({ status: 400, reached: false });
		expect(getClientRecord).toHaveBeenCalledWith(SITE_KEY);
	});

	it("rejects a registered site key that allows no domains", async () => {
		getClientRecord.mockResolvedValue(clientRecord(undefined));
		const result = await send(withKey("https://example.com"));
		expect(result).toEqual({ status: 400, reached: false });
	});

	it("rejects a request without an Origin header", async () => {
		getClientRecord.mockResolvedValue(clientRecord(["example.com"]));
		const result = await send(withKey());
		expect(result).toEqual({ status: 400, reached: false });
	});

	it.each([
		["the exact domain", "https://example.com"],
		["a subdomain", "https://shop.example.com"],
		[
			"the Google Translate proxy of the domain",
			"https://example-com.translate.goog",
		],
	])("allows %s", async (_name: string, origin: string) => {
		getClientRecord.mockResolvedValue(clientRecord(["example.com"]));
		const result = await send(withKey(origin));
		expect(result).toEqual({ status: 200, reached: true });
	});

	it.each([
		["another domain", "https://evil.com"],
		["a lookalike suffix", "https://example.com.evil.com"],
		["a lookalike prefix", "https://evilexample.com"],
		[
			"the Google Translate proxy of another domain",
			"https://evil-com.translate.goog",
		],
		["a null origin", "null"],
	])("rejects %s", async (_name: string, origin: string) => {
		getClientRecord.mockResolvedValue(clientRecord(["example.com"]));
		const result = await send(withKey(origin));
		expect(result.reached).toBe(false);
		expect(result.status).toBeGreaterThanOrEqual(400);
	});

	it("fails closed when the client lookup throws", async () => {
		getClientRecord.mockRejectedValue(new Error("mongo down"));
		const result = await send(withKey("https://example.com"));
		expect(result).toEqual({ status: 401, reached: false });
	});

	it("skips validation while maintenance mode is on", async () => {
		setMaintenanceMode(true);
		const result = await send({ origin: "https://evil.com" });
		expect(result).toEqual({ status: 200, reached: true });
		expect(getClientRecord).not.toHaveBeenCalled();
	});
});
