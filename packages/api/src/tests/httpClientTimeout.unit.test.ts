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

// Runs against a real local HTTP server that stalls, rather than a fetch
// stub, so the timeout is proven on the actual transport.

import {
	type IncomingMessage,
	type Server,
	type ServerResponse,
	createServer,
} from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import HttpClientBase from "../api/HttpClientBase.js";
import { ApiClient } from "../api/apiClient.js";

class TestClient extends HttpClientBase {
	public get<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
		return this.fetch<T>(input, init);
	}
	public send<T, U>(input: RequestInfo, body: U): Promise<T> {
		return this.post<T, U>(input, body);
	}
	public sendWithHeaders<T, U>(
		input: RequestInfo,
		body: U,
	): Promise<{ data: T; headers: Headers }> {
		return this.postWithHeaders<T, U>(input, body);
	}
}

class TestApiClient extends ApiClient {
	public get<T>(input: RequestInfo): Promise<T> {
		return this.fetch<T>(input);
	}
}

let server: Server;
let baseUrl: string;
const open: ServerResponse[] = [];

const handler = (req: IncomingMessage, res: ServerResponse): void => {
	open.push(res);
	if (req.url === "/fast") {
		res.writeHead(200, { "content-type": "application/json" });
		res.end(JSON.stringify({ ok: true }));
		return;
	}
	if (req.url === "/stall-body") {
		// Headers arrive, the body never finishes.
		res.writeHead(200, { "content-type": "application/json" });
		res.write('{"ok":');
		return;
	}
	// Any other path: accept the request and never answer.
	req.resume();
};

beforeAll(async () => {
	vi.spyOn(console, "error").mockImplementation(() => undefined);
	server = createServer(handler);
	await new Promise<void>((resolve) =>
		server.listen(0, "127.0.0.1", () => resolve()),
	);
	const { port } = server.address() as AddressInfo;
	baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
	for (const res of open) {
		res.destroy();
	}
	server.closeAllConnections();
	await new Promise<void>((resolve) => server.close(() => resolve()));
	vi.restoreAllMocks();
});

const TIMEOUT_MS = 200;

const expectTimeout = async (call: Promise<unknown>): Promise<void> => {
	const started = Date.now();
	await expect(call).rejects.toMatchObject({ name: "TimeoutError" });
	const elapsed = Date.now() - started;
	// Timers may fire slightly early relative to Date.now(); the point is that
	// it gave up near the timeout, not the platform's ~300s.
	expect(elapsed).toBeGreaterThanOrEqual(TIMEOUT_MS / 2);
	expect(elapsed).toBeLessThan(2_000);
};

describe("request timeout", () => {
	test("GET against a stalled server fails at the timeout", async () => {
		await expectTimeout(new TestClient(baseUrl, "", TIMEOUT_MS).get("/stall"));
	}, 4_000);

	test("POST against a stalled server fails at the timeout", async () => {
		await expectTimeout(
			new TestClient(baseUrl, "", TIMEOUT_MS).send("/stall", { a: 1 }),
		);
	}, 4_000);

	test("postWithHeaders against a stalled server fails at the timeout", async () => {
		await expectTimeout(
			new TestClient(baseUrl, "", TIMEOUT_MS).sendWithHeaders("/stall", {
				a: 1,
			}),
		);
	}, 4_000);

	test("a body that stalls after the headers is also cut off", async () => {
		await expectTimeout(
			new TestClient(baseUrl, "", TIMEOUT_MS).get("/stall-body"),
		);
	}, 4_000);

	test("ApiClient forwards the timeout to the transport", async () => {
		await expectTimeout(
			new TestApiClient(baseUrl, "account", TIMEOUT_MS).get("/stall"),
		);
	}, 4_000);

	test("a fast response is unaffected", async () => {
		await expect(
			new TestClient(baseUrl, "", 5_000).get("/fast"),
		).resolves.toEqual({ ok: true });
	});

	test("a caller's own abort signal still works alongside the timeout", async () => {
		const controller = new AbortController();
		const call = new TestClient(baseUrl, "", 60_000).get("/stall", {
			signal: controller.signal,
		});
		controller.abort();
		await expect(call).rejects.toMatchObject({ name: "AbortError" });
	});

	test("without a timeout the request is left to the platform default", async () => {
		const controller = new AbortController();
		const call = new TestClient(baseUrl).get("/stall", {
			signal: controller.signal,
		});
		const outcome = await Promise.race([
			call.then(
				() => "settled",
				() => "settled",
			),
			new Promise<string>((resolve) =>
				setTimeout(() => resolve("pending"), TIMEOUT_MS * 2),
			),
		]);
		controller.abort();
		await call.catch(() => undefined);
		expect(outcome).toBe("pending");
	});
});
