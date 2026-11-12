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

import { EventEmitter } from "node:events";
import { MAX_PAD_BYTES } from "@prosopo/types";
import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { padResponseMiddleware } from "../../../utils/tarpitPadding.js";

interface FakeOptions {
	padBytes?: number;
	/** Bytes accepted before `write` starts returning false. */
	highWaterMark?: number;
}

interface FakeResponse {
	res: Response;
	emitter: EventEmitter;
	/** Everything written through the streaming path, in order. */
	body: () => string;
	written: () => number;
	jsonMock: ReturnType<typeof vi.fn>;
	headers: Record<string, string>;
	ended: () => boolean;
	destroyed: () => boolean;
	close: () => void;
}

const makeRes = ({ padBytes, highWaterMark }: FakeOptions): FakeResponse => {
	const chunks: string[] = [];
	const headers: Record<string, string> = {};
	const emitter = new EventEmitter();
	let written = 0;
	let ended = false;
	let destroyed = false;
	const jsonMock = vi.fn();

	const res = Object.assign(emitter, {
		locals: { padBytes },
		json: jsonMock,
		get writableEnded(): boolean {
			return ended;
		},
		get destroyed(): boolean {
			return destroyed;
		},
		setHeader: (name: string, value: string): void => {
			headers[name.toLowerCase()] = value;
		},
		write: (chunk: string): boolean => {
			chunks.push(chunk);
			written += chunk.length;
			return highWaterMark === undefined || written < highWaterMark;
		},
		end: (): unknown => {
			ended = true;
			return res;
		},
		destroy: (): void => {
			destroyed = true;
		},
	}) as unknown as Response;

	return {
		res,
		emitter,
		body: () => chunks.join(""),
		written: () => written,
		jsonMock,
		headers,
		ended: () => ended,
		destroyed: () => destroyed,
		close: () => {
			destroyed = true;
			emitter.emit("close");
		},
	};
};

const flush = (): Promise<void> =>
	new Promise((resolve) => setImmediate(resolve));

const send = async (fake: FakeResponse, body: object): Promise<void> => {
	const next = vi.fn() as unknown as NextFunction;
	padResponseMiddleware({} as Request, fake.res, next);
	expect(next).toHaveBeenCalled();
	fake.res.json(body);
	await flush();
};

const CHALLENGE = {
	status: "ok",
	challenge: "0x1234",
	difficulty: 9,
	timestamp: "1764000000000",
};

const padOf = (parsed: Record<string, unknown>): string[] =>
	Object.entries(parsed)
		.filter(([key]) => !(key in CHALLENGE))
		.map(([, value]) => String(value));

describe("padResponseMiddleware", () => {
	it("leaves the response untouched when no padding was resolved", async () => {
		const fake = makeRes({ padBytes: undefined });
		await send(fake, CHALLENGE);
		expect(fake.jsonMock).toHaveBeenCalledWith(CHALLENGE);
		expect(fake.body()).toBe("");
	});

	it("leaves the response untouched for a zero or negative padBytes", async () => {
		for (const padBytes of [0, -1]) {
			const fake = makeRes({ padBytes });
			await send(fake, CHALLENGE);
			expect(fake.jsonMock).toHaveBeenCalledWith(CHALLENGE);
			expect(fake.body()).toBe("");
		}
	});

	it("emits the requested total padding and keeps every real field", async () => {
		const fake = makeRes({ padBytes: 4096 });
		await send(fake, CHALLENGE);

		expect(fake.jsonMock).not.toHaveBeenCalled();
		const parsed: Record<string, unknown> = JSON.parse(fake.body());
		expect(parsed).toMatchObject(CHALLENGE);
		expect(padOf(parsed).join("")).toHaveLength(4096);
		expect(fake.headers["content-type"]).toBe(
			"application/json; charset=utf-8",
		);
		expect(fake.ended()).toBe(true);
	});

	it("interleaves the padding so no real field arrives before some of it", async () => {
		const fake = makeRes({ padBytes: 4096 });
		await send(fake, CHALLENGE);
		const body = fake.body();
		const parsed: Record<string, unknown> = JSON.parse(fake.body());

		const pads = padOf(parsed);
		expect(pads).toHaveLength(Object.keys(CHALLENGE).length);
		for (const field of Object.keys(CHALLENGE)) {
			expect(body.indexOf(`"${field}"`)).toBeGreaterThan(0);
		}
		const lastPad = pads[pads.length - 1] ?? "";
		expect(body.indexOf('"timestamp"')).toBeGreaterThan(4096 - lastPad.length);
	});

	it("uses unpredictable pad keys rather than a fixed marker", async () => {
		const keysFor = async (): Promise<string[]> => {
			const fake = makeRes({ padBytes: 512 });
			await send(fake, CHALLENGE);
			const parsed: Record<string, unknown> = JSON.parse(fake.body());
			return Object.keys(parsed).filter((key) => !(key in CHALLENGE));
		};
		const first = await keysFor();
		const second = await keysFor();

		expect(first).not.toContain("pad");
		expect(first).not.toEqual(second);
	});

	it("pads with incompressible bytes", async () => {
		const fake = makeRes({ padBytes: 8192 });
		await send(fake, CHALLENGE);
		const parsed: Record<string, unknown> = JSON.parse(fake.body());
		expect(new Set(padOf(parsed).join("")).size).toBeGreaterThan(50);
	});

	it("clamps padding to the 5 MiB ceiling so it cannot be used as an amplifier", async () => {
		const fake = makeRes({ padBytes: MAX_PAD_BYTES * 10 });
		await send(fake, CHALLENGE);
		const parsed: Record<string, unknown> = JSON.parse(fake.body());
		expect(padOf(parsed).join("")).toHaveLength(MAX_PAD_BYTES);
	});

	it("emits valid JSON for a body with no fields", async () => {
		const fake = makeRes({ padBytes: 64 });
		await send(fake, {});
		const parsed: Record<string, unknown> = JSON.parse(fake.body());
		expect(padOf(parsed).join("")).toHaveLength(64);
	});

	it("does not pad a non-object body, which has no fields to splice into", async () => {
		const fake = makeRes({ padBytes: 64 });
		await send(fake, ["a", "b"]);
		expect(fake.jsonMock).toHaveBeenCalledWith(["a", "b"]);
		expect(fake.body()).toBe("");
	});

	it("stops writing once the socket reports backpressure and resumes on drain", async () => {
		const fake = makeRes({ padBytes: 512 * 1024, highWaterMark: 64 * 1024 });
		await send(fake, CHALLENGE);

		const paused = fake.written();
		expect(paused).toBeLessThan(128 * 1024);
		expect(fake.ended()).toBe(false);

		fake.emitter.emit("drain");
		await flush();
		expect(fake.written()).toBeGreaterThan(paused);
	});

	it("abandons the pad when the peer stops reading, instead of buffering it", async () => {
		const fake = makeRes({
			padBytes: MAX_PAD_BYTES,
			highWaterMark: 64 * 1024,
		});
		await send(fake, CHALLENGE);

		const paused = fake.written();
		fake.close();
		await flush();

		expect(fake.written()).toBe(paused);
		expect(fake.written()).toBeLessThan(128 * 1024);
		expect(fake.ended()).toBe(false);
	});

	it("does not resume writing after a drain that follows a close", async () => {
		const fake = makeRes({
			padBytes: MAX_PAD_BYTES,
			highWaterMark: 64 * 1024,
		});
		await send(fake, CHALLENGE);

		fake.close();
		await flush();
		const paused = fake.written();

		fake.emitter.emit("drain");
		await flush();
		expect(fake.written()).toBe(paused);
	});
});
