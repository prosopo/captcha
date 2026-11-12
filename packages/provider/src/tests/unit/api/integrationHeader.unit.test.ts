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
import { INTEGRATION_HEADER } from "@prosopo/types";
import cors from "cors";
import express, { type Request, type Response } from "express";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { providerCorsOptions } from "../../../api/startProviderApi.js";

let server: Server;
let baseUrl: string;

beforeAll(async () => {
	const app = express();
	app.use(cors(providerCorsOptions));
	app.post("/", (_req: Request, res: Response): void => {
		res.json({});
	});
	await new Promise<void>((resolve) => {
		server = app.listen(0, "127.0.0.1", () => resolve());
	});
	const address: AddressInfo | string | null = server.address();
	if (address === null || typeof address === "string") {
		throw new Error(`expected a TCP address, got ${address}`);
	}
	baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
	await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("provider CORS", () => {
	it("allows x-prosopo-integration in a cross-origin preflight", async () => {
		const response = await fetch(baseUrl, {
			method: "OPTIONS",
			headers: {
				Origin: "https://customer.example",
				"Access-Control-Request-Method": "POST",
				"Access-Control-Request-Headers":
					"x-prosopo-integration,prosopo-site-key,prosopo-user",
			},
		});
		const allowed: string[] = (
			response.headers.get("access-control-allow-headers") ?? ""
		)
			.toLowerCase()
			.split(",");
		expect(allowed).toContain(INTEGRATION_HEADER.toLowerCase());
	});
});
