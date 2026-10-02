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
// WITHOUT WARRANTIES OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {
	type IncomingHttpHeaders,
	type IncomingMessage,
	type Server,
	type ServerResponse,
	createServer,
} from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
	type Case,
	MAX_BODY,
	type Result,
	type SiteKeys,
	type Target,
	VALUE_MUTATIONS,
	buildCases,
	buildTargets,
	isFailure,
	isHeavy,
	isMonotonicGrowth,
	main,
	nestedKeys,
	parseCliArgs,
	pool,
	rssKb,
	send,
	setPath,
	summarise,
	toRaw,
} from "../../fuzz/apiFuzz.js";

const KEYS: SiteKeys = {
	image: "image-key",
	pow: "pow-key",
	puzzle: "puzzle-key",
	frictionless: "frictionless-key",
};
const USER = "user-address";

const result = (over: Partial<Result>): Result => ({
	target: "/t",
	label: "l",
	status: 200,
	ms: 1,
	body: "",
	...over,
});

describe("nestedKeys", () => {
	it("lists every key path depth first and skips arrays", () => {
		expect(nestedKeys({ a: 1, b: { c: 2, d: [1, { e: 3 }] } })).toEqual([
			["a"],
			["b"],
			["b", "c"],
			["b", "d"],
		]);
	});

	it("returns nothing for non-objects", () => {
		expect(nestedKeys(null)).toEqual([]);
		expect(nestedKeys([1, 2])).toEqual([]);
		expect(nestedKeys("x")).toEqual([]);
	});
});

describe("setPath", () => {
	it("writes the raw value verbatim at a nested path", () => {
		expect(setPath({ a: { b: 1 }, c: 2 }, ["a", "b"], '"\\ud800"')).toBe(
			'{"a":{"b":"\\ud800"},"c":2}',
		);
	});

	it("keeps $ sequences in the raw value literal", () => {
		expect(setPath({ a: 1 }, ["a"], '"$&$1"')).toBe('{"a":"$&$1"}');
	});

	it("returns an empty string when the path runs through a non-object", () => {
		expect(setPath({ a: 1 }, ["a", "b"], "1")).toBe("");
		expect(setPath({ a: [1] }, ["a", "b"], "1")).toBe("");
		expect(setPath({ a: 1 }, [], "1")).toBe("");
	});

	it("leaves the input body untouched", () => {
		const body = { a: { b: 1 } };
		setPath(body, ["a", "b"], "2");
		expect(body).toEqual({ a: { b: 1 } });
	});
});

describe("toRaw", () => {
	it("serialises JSON values and passes raw values through", () => {
		expect(toRaw(null)).toBe("null");
		expect(toRaw({ a: 1 })).toBe('{"a":1}');
		expect(toRaw({ raw: "9007199254740993" })).toBe("9007199254740993");
	});

	it("treats an object with other keys beside raw as JSON", () => {
		expect(toRaw({ raw: "x", other: 1 })).toBe('{"raw":"x","other":1}');
	});

	it("keeps the unsafe integer literal that JSON.stringify would round", () => {
		const unsafe = VALUE_MUTATIONS.find(([name]) => name === "unsafe-int");
		expect(unsafe && toRaw(unsafe[1])).toBe("9007199254740993");
	});
});

describe("buildTargets", () => {
	const targets = buildTargets(USER, KEYS, 1700000000000);
	const byPath = (suffix: string): Target | undefined =>
		targets.find((t) => t.path.endsWith(suffix));

	it("sends each challenge endpoint the site key for its captcha type", () => {
		expect(byPath("/captcha/image")?.siteKey).toBe(KEYS.image);
		expect(byPath("/captcha/image")?.body.dapp).toBe(KEYS.image);
		expect(byPath("/captcha/pow")?.siteKey).toBe(KEYS.pow);
		expect(byPath("/captcha/puzzle")?.siteKey).toBe(KEYS.puzzle);
		expect(byPath("/captcha/frictionless")?.siteKey).toBe(KEYS.frictionless);
		expect(byPath("/pow/solution")?.body.challenge).toBe(
			`1700000000000___${USER}___${KEYS.pow}___1`,
		);
	});

	it("covers the challenge, submit and verify endpoints", () => {
		expect(targets.map((t) => t.path.split("/client/")[1])).toEqual([
			"captcha/image",
			"captcha/pow",
			"captcha/puzzle",
			"captcha/frictionless",
			"solution",
			"pow/solution",
			"puzzle/solution",
			"detector/assign",
			"spam/email",
			"image/dapp/verify",
			"pow/verify",
			"puzzle/verify",
			"authenticated/verify",
		]);
	});
});

describe("buildCases", () => {
	const target: Target = {
		path: "/p",
		siteKey: "k",
		body: { a: "x", n: { m: 1 }, list: [1] },
		arrayField: { key: "list", item: 1 },
	};
	const cases = buildCases(target);
	const labels = cases.map((c) => c.label);

	it("mutates every key path with every value", () => {
		for (const path of ["a", "n", "n.m", "list"]) {
			for (const [name] of VALUE_MUTATIONS) {
				expect(labels).toContain(`${path}=${name}`);
			}
		}
		expect(labels).toContain("a=missing");
		expect(labels).not.toContain("n.m=missing");
	});

	it("drops a field for the missing case", () => {
		const missing = cases.find((c) => c.label === "n=missing");
		expect(missing && JSON.parse(missing.raw)).toEqual({ a: "x", list: [1] });
	});

	it("tags every case with the target's path and site key", () => {
		expect(cases.every((c) => c.target === "/p" && c.siteKey === "k")).toBe(
			true,
		);
	});

	it("keeps every body under the limit, including the huge arrays", () => {
		expect(
			cases.every((c) => c.raw.length > 0 && c.raw.length <= MAX_BODY),
		).toBe(true);
		const huge = cases.find((c) => c.label.startsWith("list=huge-array("));
		expect(huge?.raw.length).toBeGreaterThan(MAX_BODY - 4000);
		expect(labels).toContain("list=huge-null-array");
	});

	it("skips cases over a smaller limit", () => {
		const small = buildCases(target, 1000);
		expect(small.every((c) => c.raw.length <= 1000)).toBe(true);
		expect(small.map((c) => c.label)).not.toContain("extra-field");
	});

	it("sends the wrong content types with the valid body", () => {
		expect(cases.find((c) => c.label === "text-plain")?.contentType).toBe(
			"text/plain",
		);
	});

	it("marks the heavy cases for the burst phase", () => {
		const heavy = cases.filter(isHeavy).map((c) => c.label);
		expect(heavy).toContain("extra-field");
		expect(heavy).toContain("a=long-token");
		expect(heavy).toContain("a=deep-array");
		expect(heavy).toContain("list=huge-null-array");
		expect(heavy).not.toContain("valid");
	});
});

describe("pool", () => {
	it("keeps input order and never exceeds the concurrency", async () => {
		let inFlight = 0;
		let peak = 0;
		const out = await pool([5, 1, 4, 2, 3], 2, async (n: number) => {
			inFlight++;
			peak = Math.max(peak, inFlight);
			await new Promise<void>((r) => setTimeout(r, n));
			inFlight--;
			return n * 10;
		});
		expect(out).toEqual([50, 10, 40, 20, 30]);
		expect(peak).toBe(2);
	});

	it("handles an empty list", async () => {
		expect(await pool([], 4, async (n: number) => n)).toEqual([]);
	});
});

describe("isMonotonicGrowth", () => {
	it("flags a series that only grows", () => {
		expect(isMonotonicGrowth([100, 110, 110, 130])).toBe(true);
	});

	it("does not flag a plateau, a drop, a flat line or too few samples", () => {
		expect(isMonotonicGrowth([100, 150, 140, 150])).toBe(false);
		expect(isMonotonicGrowth([100, 100, 100])).toBe(false);
		expect(isMonotonicGrowth([100, 200])).toBe(false);
	});

	it("ignores missing and unreadable samples", () => {
		expect(isMonotonicGrowth([0, 100, -1, 120, 130])).toBe(true);
	});
});

describe("summarise", () => {
	it("counts statuses and dedupes failures by target and label", () => {
		const s = summarise(
			[
				result({ status: 400 }),
				result({ status: 500, label: "a" }),
				result({ status: 500, label: "a" }),
				result({ status: 0, label: "b", ms: 30000 }),
			],
			[1, 2, 3, 100],
			[100, 110, 120],
		);
		expect(s.requests).toBe(4);
		expect(s.byStatus).toEqual({ "0": 1, "400": 1, "500": 2 });
		expect(s.failures).toBe(3);
		expect(s.uniqueFailures.map((r) => r.label)).toEqual(["a", "b"]);
		expect(s.slowest[0]).toBe("/t b 30000ms");
		expect(s.healthzP50).toBe(3);
		expect(s.healthzP99).toBe(100);
		expect(s.healthzMax).toBe(100);
		expect(s.rssMonotonicGrowth).toBe(true);
	});

	it("handles an empty run", () => {
		const s = summarise([], [], []);
		expect(s.failures).toBe(0);
		expect(s.healthzP50).toBe(0);
		expect(s.healthzMax).toBe(0);
	});

	it("treats 5xx and no response as failures, 4xx as handled", () => {
		expect(isFailure(result({ status: 503 }))).toBe(true);
		expect(isFailure(result({ status: 0 }))).toBe(true);
		expect(isFailure(result({ status: 499 }))).toBe(false);
	});
});

describe("parseCliArgs", () => {
	it("falls back to --site-key for the per-type keys", () => {
		const o = parseCliArgs(["--site-key", "f", "--image-site-key", "i"]);
		expect(o.siteKeys).toEqual({
			image: "i",
			pow: "f",
			puzzle: "f",
			frictionless: "f",
		});
		expect(o.concurrency).toBe(4);
		expect(o.burst).toBe(10);
	});

	it("rejects a missing site key and bad counts", () => {
		expect(() => parseCliArgs([])).toThrow("--site-key is required");
		expect(() => parseCliArgs(["--site-key", "f", "--burst", "0"])).toThrow(
			"--burst must be a positive integer",
		);
		expect(() =>
			parseCliArgs(["--site-key", "f", "--concurrency", "x"]),
		).toThrow("--concurrency must be a positive integer");
	});
});

describe("rssKb", () => {
	it("reads this process's RSS, 0 with no pid and -1 for an unknown pid", () => {
		expect(rssKb(String(process.pid))).toBeGreaterThan(0);
		expect(rssKb("")).toBe(0);
		expect(rssKb("999999999")).toBe(-1);
	});
});

describe("against a local server", () => {
	let server: Server | undefined;
	let baseUrl = "";
	const seen: { url: string; headers: IncomingHttpHeaders; body: string }[] =
		[];

	beforeAll(async () => {
		server = createServer((req: IncomingMessage, res: ServerResponse) => {
			let body = "";
			req.on("data", (chunk: Buffer) => {
				body += chunk.toString();
			});
			req.on("end", () => {
				seen.push({ url: req.url ?? "", headers: req.headers, body });
				res.statusCode = body.includes('"email":null') ? 500 : 400;
				res.end("x".repeat(1000));
			});
		});
		await new Promise<void>((resolve) =>
			server?.listen(0, "127.0.0.1", () => resolve()),
		);
		const address = server?.address() as AddressInfo;
		baseUrl = `http://127.0.0.1:${address.port}`;
	});

	afterAll(async () => {
		await new Promise<void>((resolve) => server?.close(() => resolve()));
	});

	const aCase: Case = {
		target: "/v1/x",
		siteKey: "sk",
		label: "valid",
		raw: '{"a":1}',
		contentType: "application/json",
	};

	it("send posts the case with the auth headers and truncates the body", async () => {
		const r = await send({ baseUrl, origin: "http://o", user: "u" }, aCase);
		expect(r.status).toBe(400);
		expect(r.body).toHaveLength(300);
		const last = seen[seen.length - 1];
		expect(last?.url).toBe("/v1/x");
		expect(last?.body).toBe('{"a":1}');
		expect(last?.headers["prosopo-site-key"]).toBe("sk");
		expect(last?.headers["prosopo-user"]).toBe("u");
		expect(last?.headers.origin).toBe("http://o");
	});

	it("send reports status 0 when nothing answers", async () => {
		const r = await send(
			{ baseUrl: "http://127.0.0.1:1", origin: "o", user: "u" },
			aCase,
		);
		expect(r.status).toBe(0);
		expect(r.body.length).toBeGreaterThan(0);
	});

	it("main fuzzes the selected endpoint and exits 1 on a 5xx", async () => {
		const lines: string[] = [];
		const spy = vi.spyOn(console, "log").mockImplementation((line: string) => {
			lines.push(line);
		});
		const code = await main([
			"--base-url",
			baseUrl,
			"--site-key",
			"sk",
			"--only",
			"spam/email",
			"--burst",
			"2",
		]);
		spy.mockRestore();
		expect(code).toBe(1);
		const events = lines.map(
			(l): { event: string; label?: string; uniqueFailures?: number } =>
				JSON.parse(l),
		);
		expect(events[0]?.event).toBe("start");
		expect(
			events.filter((e) => e.event === "failure").map((e) => e.label),
		).toEqual(["email=null"]);
		expect(events[events.length - 1]).toMatchObject({
			event: "summary",
			uniqueFailures: 1,
		});
		expect(seen.some((s) => s.url === "/healthz")).toBe(true);
	});
});
