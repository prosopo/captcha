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
import express, { type Request, type Response } from "express";
import i18next, { type i18n } from "i18next";
import { handle } from "i18next-http-middleware";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { i18nSharedOptions } from "../i18SharedOptions.js";
import { LANGUAGE_HEADER } from "../languagePreference.js";
import { createRequestLanguageDetector } from "../requestLanguageDetector.js";

// Real i18next, real middleware, real express and real HTTP requests, as the
// provider runs them: proves the detector's answer survives i18next's own
// matching and reaches req.language and req.t.

const resources = {
	en: { translation: { TARGET: { owl: "owl" } } },
	tr: { translation: { TARGET: { owl: "baykuş" } } },
	no: { translation: { TARGET: { owl: "ugle" } } },
	zh: { translation: { TARGET: { owl: "猫头鹰" } } },
	"zh-TW": { translation: { TARGET: { owl: "貓頭鷹" } } },
};

type Answer = {
	language: string;
	owl: string;
	contentLanguage: string | null;
	setCookie: string | null;
};

let server: Server;
let baseUrl: string;

beforeAll(async () => {
	const instance: i18n = i18next.createInstance();
	await instance.use(createRequestLanguageDetector()).init({
		...i18nSharedOptions,
		ns: ["translation"],
		resources,
	});
	const app = express();
	app.use(handle(instance));
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
): Promise<Answer> => {
	const response = await fetch(`${baseUrl}/${query}`, { headers });
	const body: { language: string; owl: string } = await response.json();
	return {
		...body,
		contentLanguage: response.headers.get("content-language"),
		setCookie: response.headers.get("set-cookie"),
	};
};

describe("request language detection", () => {
	it("serves Accept-Language", async () => {
		const answer = await ask({ "Accept-Language": "tr-TR,tr;q=0.9" });
		expect(answer.language).toBe("tr");
		expect(answer.owl).toBe("baykuş");
	});

	it("prefers Prosopo-Lang over Accept-Language", async () => {
		const answer = await ask({
			[LANGUAGE_HEADER]: "tr",
			"Accept-Language": "no",
		});
		expect(answer.language).toBe("tr");
	});

	it("prefers ?lng= over both headers", async () => {
		const answer = await ask(
			{ [LANGUAGE_HEADER]: "tr", "Accept-Language": "tr" },
			"?lng=no",
		);
		expect(answer.language).toBe("no");
		expect(answer.owl).toBe("ugle");
	});

	it("falls through a header naming only unsupported languages", async () => {
		const answer = await ask({
			[LANGUAGE_HEADER]: "xx",
			"Accept-Language": "tr",
		});
		expect(answer.language).toBe("tr");
	});

	it("maps nb to no and zh-SG to zh", async () => {
		expect((await ask({ [LANGUAGE_HEADER]: "nb-NO" })).language).toBe("no");
		const chinese = await ask({ "Accept-Language": "zh-SG" });
		expect(chinese.language).toBe("zh");
		expect(chinese.owl).toBe("猫头鹰");
	});

	it("serves Traditional Chinese, not Simplified, for zh-TW", async () => {
		const answer = await ask({ "Accept-Language": "zh-TW, de;q=0.8" });
		expect(answer.language).toBe("zh-TW");
		expect(answer.owl).toBe("貓頭鷹");
	});

	it("falls back to English for an unsupported language", async () => {
		const answer = await ask({ "Accept-Language": "xx" });
		expect(answer.language).toBe("en");
		expect(answer.owl).toBe("owl");
	});

	it("falls back to English when nothing is sent", async () => {
		expect((await ask({})).language).toBe("en");
	});

	it("ignores an i18next cookie and sets none", async () => {
		const answer = await ask({
			Cookie: "i18next=tr",
			"Accept-Language": "no",
		});
		expect(answer.language).toBe("no");
		expect(answer.setCookie).toBeNull();
	});

	it("reports the chosen language in Content-Language", async () => {
		expect((await ask({ [LANGUAGE_HEADER]: "tr" })).contentLanguage).toBe("tr");
	});
});
