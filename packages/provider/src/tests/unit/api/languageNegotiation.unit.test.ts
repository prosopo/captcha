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
import { LANGUAGE_HEADER, i18nMiddleware } from "@prosopo/locale";
import cors from "cors";
import express, { type Request, type Response } from "express";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { providerCorsOptions } from "../../../api/startProviderApi.js";

// The provider's own CORS options and i18n middleware over real HTTP: a
// cross-origin widget may send Prosopo-Lang, and the provider answers in the
// language it names, with ?lng= > Prosopo-Lang > Accept-Language.

let server: Server;
let baseUrl: string;

beforeAll(async () => {
	const app = express();
	app.use(cors(providerCorsOptions));
	app.use(await i18nMiddleware({}));
	app.get("/", (req: Request, res: Response): void => {
		res.json({ language: req.language, owl: req.t("TARGET.owl") });
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

const ask = async (
	headers: Record<string, string>,
	query = "",
): Promise<{ language: string; owl: string }> =>
	(await fetch(`${baseUrl}/${query}`, { headers })).json();

describe("provider language negotiation", () => {
	it("allows Prosopo-Lang in a cross-origin preflight", async () => {
		const response = await fetch(baseUrl, {
			method: "OPTIONS",
			headers: {
				Origin: "https://customer.example",
				"Access-Control-Request-Method": "POST",
				"Access-Control-Request-Headers": "prosopo-lang,accept-language",
			},
		});
		const allowed: string[] = (
			response.headers.get("access-control-allow-headers") ?? ""
		)
			.toLowerCase()
			.split(",");
		expect(allowed).toContain(LANGUAGE_HEADER.toLowerCase());
		expect(allowed).toContain("accept-language");
	});

	it("translates from Accept-Language", async () => {
		const answer = await ask({ "Accept-Language": "tr-TR,en;q=0.5" });
		expect(answer.language).toBe("tr");
		expect(answer.owl).toBe("baykuş");
	});

	it("prefers Prosopo-Lang over Accept-Language", async () => {
		expect(
			(await ask({ [LANGUAGE_HEADER]: "tr", "Accept-Language": "de" }))
				.language,
		).toBe("tr");
	});

	it("prefers ?lng= over both headers", async () => {
		expect(
			(
				await ask(
					{ [LANGUAGE_HEADER]: "tr", "Accept-Language": "tr" },
					"?lng=de",
				)
			).language,
		).toBe("de");
	});

	it("skips a source naming only unsupported languages", async () => {
		expect(
			(
				await ask(
					{ [LANGUAGE_HEADER]: "yy", "Accept-Language": "tr" },
					"?lng=xx",
				)
			).language,
		).toBe("tr");
	});

	it("serves a variant from its parent and falls back to English", async () => {
		expect((await ask({ [LANGUAGE_HEADER]: "zh-SG" })).language).toBe("zh");
		expect((await ask({ [LANGUAGE_HEADER]: "zh-TW" })).language).toBe("en");
		const english = await ask({ "Accept-Language": "xx" });
		expect(english.language).toBe("en");
		expect(english.owl).toBe("owl");
	});
});
