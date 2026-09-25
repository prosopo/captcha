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
import { ALWAYS_PASS_SITE_KEY } from "@prosopo/types";
import type { ProviderEnvironment } from "@prosopo/types-env";
import express, { type Request, type Response } from "express";
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
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
			domainPatternMatcher: (referrer: string, domain: string): boolean =>
				new URL(referrer).hostname === domain,
		};
	},
}));

// Two valid sr25519 addresses: the attacker's own site key and a victim's.
const ATTACKER = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
const VICTIM = "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty";

describe("domainMiddleware", () => {
	let server: Server;
	let baseUrl: string;

	beforeAll(async () => {
		const app = express();
		app.use(express.json());
		app.use((req: Request, _res: Response, next) => {
			req.logger = getLogger("error", "test:domain-middleware");
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

	beforeEach(() => {
		getClientRecord.mockReset();
		getClientRecord.mockImplementation(async (siteKey: string) =>
			siteKey === ATTACKER
				? { settings: { domains: ["attacker.example"] } }
				: { settings: { domains: ["victim.example"] } },
		);
	});

	const post = (
		headerSiteKey: string,
		body: object,
	): Promise<globalThis.Response> =>
		fetch(`${baseUrl}/client`, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				origin: "https://attacker.example",
				"prosopo-site-key": headerSiteKey,
			},
			body: JSON.stringify(body),
		});

	it("lets a request through when the body site key matches the header", async () => {
		const res = await post(ATTACKER, { dapp: ATTACKER });
		expect(res.status).toBe(200);
	});

	it("rejects a body site key that differs from the origin-checked header", async () => {
		// The attacker's origin is allowed for their own key only; the handler
		// would act for the victim's key taken from the body.
		const res = await post(ATTACKER, { dapp: VICTIM });
		expect(res.status).toBe(400);
	});

	it("rejects a victim body site key behind a reserved test site key header", async () => {
		const res = await post(ALWAYS_PASS_SITE_KEY, { dapp: VICTIM });
		expect(res.status).toBe(400);
	});

	it("lets a request with no body site key through on the header alone", async () => {
		const res = await post(ATTACKER, {});
		expect(res.status).toBe(200);
	});
});
