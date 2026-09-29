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

import { MAX_PAD_BYTES } from "@prosopo/types";
import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { padResponseMiddleware } from "../../../utils/tarpitPadding.js";

interface FakeResponse {
	res: Response;
	/** Everything written through the streaming path, in order. */
	body: () => string;
	jsonMock: ReturnType<typeof vi.fn>;
	headers: Record<string, string>;
	ended: () => boolean;
}

const makeRes = (padBytes?: number): FakeResponse => {
	const chunks: string[] = [];
	const headers: Record<string, string> = {};
	let ended = false;
	const jsonMock = vi.fn();
	const res = {
		locals: { padBytes },
		json: jsonMock,
		setHeader: (name: string, value: string) => {
			headers[name.toLowerCase()] = value;
		},
		write: (chunk: string) => {
			chunks.push(chunk);
			return true;
		},
		end: () => {
			ended = true;
			return res;
		},
	} as unknown as Response;
	return {
		res,
		body: () => chunks.join(""),
		jsonMock,
		headers,
		ended: () => ended,
	};
};

const send = (fake: FakeResponse, body: object): void => {
	const next = vi.fn() as unknown as NextFunction;
	padResponseMiddleware({} as Request, fake.res, next);
	expect(next).toHaveBeenCalled();
	fake.res.json(body);
};

const CHALLENGE = {
	status: "ok",
	challenge: "0x1234",
	difficulty: 9,
	timestamp: "1764000000000",
};

describe("padResponseMiddleware", () => {
	it("leaves the response untouched when no padding was resolved", () => {
		const fake = makeRes(undefined);
		send(fake, CHALLENGE);
		// Straight through to the original res.json — not re-serialised, and
		// no streaming writes, so an unconfigured site is byte-for-byte as
		// it was before the tarpit existed.
		expect(fake.jsonMock).toHaveBeenCalledWith(CHALLENGE);
		expect(fake.body()).toBe("");
	});

	it("leaves the response untouched for a zero or negative padBytes", () => {
		for (const padBytes of [0, -1]) {
			const fake = makeRes(padBytes);
			send(fake, CHALLENGE);
			expect(fake.jsonMock).toHaveBeenCalledWith(CHALLENGE);
			expect(fake.body()).toBe("");
		}
	});

	it("appends the requested padding and keeps every real field", () => {
		const fake = makeRes(4096);
		send(fake, CHALLENGE);

		expect(fake.jsonMock).not.toHaveBeenCalled();
		const parsed = JSON.parse(fake.body());
		expect(parsed.pad).toHaveLength(4096);
		expect(parsed).toMatchObject(CHALLENGE);
		expect(fake.headers["content-type"]).toBe(
			"application/json; charset=utf-8",
		);
		expect(fake.ended()).toBe(true);
	});

	it("writes the padding before any real field, so a scraper cannot read a prefix and abort", () => {
		const fake = makeRes(2048);
		send(fake, CHALLENGE);
		const body = fake.body();
		expect(body.indexOf('"pad"')).toBe(1);
		expect(body.indexOf('"challenge"')).toBeGreaterThan(2048);
	});

	it("pads with incompressible bytes", () => {
		// The point of the padding is bandwidth: a run of one repeated
		// character would gzip away to nothing in transit. Distinct
		// characters across a base64 alphabet is the cheap proxy for that.
		const fake = makeRes(8192);
		send(fake, CHALLENGE);
		const pad: string = JSON.parse(fake.body()).pad;
		expect(new Set(pad).size).toBeGreaterThan(50);
	});

	it("clamps padding to the 5 MiB ceiling so it cannot be used as an amplifier", () => {
		const fake = makeRes(MAX_PAD_BYTES * 10);
		send(fake, CHALLENGE);
		expect(JSON.parse(fake.body()).pad).toHaveLength(MAX_PAD_BYTES);
	});

	it("emits valid JSON for a body with no fields", () => {
		const fake = makeRes(64);
		send(fake, {});
		expect(JSON.parse(fake.body()).pad).toHaveLength(64);
	});

	it("does not pad a non-object body, which has no fields to splice into", () => {
		const fake = makeRes(64);
		send(fake, ["a", "b"]);
		expect(fake.jsonMock).toHaveBeenCalledWith(["a", "b"]);
		expect(fake.body()).toBe("");
	});
});
