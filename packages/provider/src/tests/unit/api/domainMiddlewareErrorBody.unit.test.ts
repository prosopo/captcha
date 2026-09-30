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
import { i18nMiddleware } from "@prosopo/locale";
import { getLogger } from "@prosopo/logger";
import type { ProviderEnvironment } from "@prosopo/types-env";
import express, { type Request, type Response } from "express";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { domainMiddleware } from "../../../api/domainMiddleware.js";

const { getClientRecord } = vi.hoisted(() => ({
	getClientRecord:
		vi.fn<
			(
				siteKey: string,
			) => Promise<{ settings: { domains: string[] } } | undefined>
		>(),
}));

vi.mock("../../../tasks/index.js", () => ({
	Tasks: class {
		db = { getClientRecord };
		clientTaskManager = {
			domainPatternMatcher: (_referrer: string, _domain: string): boolean =>
				false,
		};
	},
}));

const SITE_KEY = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
const SECRET = "mongodb://admin:hunter2@10.0.0.5:27017/provider";

describe("domainMiddleware error bodies", () => {
	let server: Server;
	let baseUrl: string;

	beforeAll(async () => {
		const app = express();
		app.use(express.json());
		app.use((req: Request, _res: Response, next) => {
			req.logger = getLogger("error", "test:domain-middleware-error");
			next();
		});
		app.use(await i18nMiddleware({}));
		const env: Partial<ProviderEnvironment> = {};
		app.use(domainMiddleware(env as ProviderEnvironment));
		app.post("/client", (_req: Request, res: Response) => {
			res.json({ reached: true });
		});
		server = app.listen(0, "127.0.0.1");
		await new Promise<void>((resolve) => server.once("listening", resolve));
		const address: AddressInfo | string | null = server.address();
		if (address === null || typeof address === "string")
			throw new Error("test server has no TCP address");
		baseUrl = `http://127.0.0.1:${address.port}`;
	});

	afterAll(async () => {
		await new Promise<void>((resolve) => server.close(() => resolve()));
	});

	it("does not return a thrown non-API error to the caller", async () => {
		// Driver errors carry enumerable fields, which JSON serialisation keeps.
		getClientRecord.mockRejectedValueOnce(
			Object.assign(new Error("connect failed"), { errmsg: SECRET }),
		);
		const res = await fetch(`${baseUrl}/client`, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				origin: "https://site.example",
				"prosopo-site-key": SITE_KEY,
			},
			body: JSON.stringify({ dapp: SITE_KEY }),
		});
		const text = await res.text();
		expect(res.status).toBe(401);
		expect(text).not.toContain("hunter2");
		expect(JSON.parse(text)).toEqual({
			error: "Unauthorized",
			message: "Unauthorized",
		});
	});
});
