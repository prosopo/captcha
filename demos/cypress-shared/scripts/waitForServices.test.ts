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
import type { ClientRequest, IncomingMessage } from "node:http";
import { describe, expect, it, vi } from "vitest";
import {
	type Service,
	type ServiceStatus,
	checkService,
	defaultServices,
	waitForServices,
} from "./waitForServices.js";

const get = vi.hoisted(() => vi.fn());

vi.mock("node:https", () => ({ default: { get } }));

/** The subset of ClientRequest the probe touches. */
class FakeRequest extends EventEmitter {
	public destroyed = false;
	public timeoutMs: number | undefined;
	private timeoutHandler: (() => void) | undefined;

	setTimeout(ms: number, handler: () => void): this {
		this.timeoutMs = ms;
		this.timeoutHandler = handler;
		return this;
	}

	destroy(): this {
		this.destroyed = true;
		return this;
	}

	fireTimeout(): void {
		this.timeoutHandler?.();
	}
}

/**
 * Stage one https.get call. `respondWith` is the status code to hand back, or
 * "error" to emit a connection failure, or "timeout" to fire the timeout hook.
 */
const stageRequest = (
	respondWith: number | "error" | "timeout",
): FakeRequest => {
	const req = new FakeRequest();
	get.mockImplementationOnce(
		(
			_url: string,
			_options: { rejectUnauthorized: boolean },
			callback: (res: IncomingMessage) => void,
		): ClientRequest => {
			queueMicrotask(() => {
				if (respondWith === "error") {
					req.emit("error", new Error("ECONNREFUSED"));
				} else if (respondWith === "timeout") {
					req.fireTimeout();
				} else {
					callback({ statusCode: respondWith } as IncomingMessage);
				}
			});
			return req as unknown as ClientRequest;
		},
	);
	return req;
};

const services: Service[] = [{ name: "One", url: "https://one.test" }];

describe("checkService", () => {
	it("is ready on 200", async () => {
		stageRequest(200);
		await expect(checkService("https://one.test")).resolves.toBe(true);
	});

	it("is ready on 304, so a cached bundle still counts", async () => {
		stageRequest(304);
		await expect(checkService("https://one.test")).resolves.toBe(true);
	});

	it("is not ready on any other status", async () => {
		stageRequest(503);
		await expect(checkService("https://one.test")).resolves.toBe(false);
	});

	it("is not ready when the status code is missing entirely", async () => {
		stageRequest(0);
		await expect(checkService("https://one.test")).resolves.toBe(false);
	});

	it("resolves false rather than throwing when the connection fails", async () => {
		stageRequest("error");
		await expect(checkService("https://one.test")).resolves.toBe(false);
	});

	it("destroys the request and resolves false on timeout", async () => {
		const req = stageRequest("timeout");
		await expect(checkService("https://one.test")).resolves.toBe(false);
		expect(req.destroyed).toBe(true);
	});

	it("applies the timeout it was given", async () => {
		const req = stageRequest(200);
		await checkService("https://one.test", 500);
		expect(req.timeoutMs).toBe(500);
	});

	it("does not verify the certificate, because the dev services are self-signed", async () => {
		stageRequest(200);
		await checkService("https://one.test");
		expect(get).toHaveBeenCalledWith(
			"https://one.test",
			{ rejectUnauthorized: false },
			expect.any(Function),
		);
	});
});

describe("waitForServices", () => {
	const noop = (): void => {};

	it("returns as soon as every service is ready", async () => {
		const check = vi.fn(() => Promise.resolve(true));
		const sleep = vi.fn(() => Promise.resolve());
		const results: ServiceStatus[] = await waitForServices({
			services,
			check,
			sleep,
			log: noop,
		});
		expect(results).toEqual([
			{ name: "One", url: "https://one.test", ready: true },
		]);
		expect(sleep).not.toHaveBeenCalled();
	});

	it("polls until the last service comes up", async () => {
		let attempt = 0;
		const check = vi.fn(() => Promise.resolve(++attempt >= 3));
		const sleep = vi.fn(() => Promise.resolve());
		await waitForServices({ services, check, sleep, log: noop });
		expect(check).toHaveBeenCalledTimes(3);
		expect(sleep).toHaveBeenCalledTimes(2);
	});

	it("waits for the configured interval between polls", async () => {
		let attempt = 0;
		const sleep = vi.fn(() => Promise.resolve());
		await waitForServices({
			services,
			check: () => Promise.resolve(++attempt >= 2),
			sleep,
			pollInterval: 50,
			log: noop,
		});
		expect(sleep).toHaveBeenCalledWith(50);
	});

	it("requires every service, not just one, to be ready", async () => {
		const two: Service[] = [
			{ name: "One", url: "https://one.test" },
			{ name: "Two", url: "https://two.test" },
		];
		let round = 0;
		const check = vi.fn((url: string) =>
			Promise.resolve(url === "https://one.test" || round++ > 0),
		);
		await waitForServices({
			services: two,
			check,
			sleep: () => Promise.resolve(),
			log: noop,
		});
		expect(check.mock.calls.length).toBeGreaterThan(2);
	});

	it("throws once the deadline passes", async () => {
		let clock = 0;
		await expect(
			waitForServices({
				services,
				check: () => Promise.resolve(false),
				sleep: () => {
					clock += 2000;
					return Promise.resolve();
				},
				now: () => clock,
				maxWait: 5000,
				log: noop,
			}),
		).rejects.toThrow("Services did not become ready in time");
	});

	it("does not probe at all when the deadline has already passed", async () => {
		// maxWait 0: the loop must not run a single round
		const check = vi.fn(() => Promise.resolve(true));
		await expect(
			waitForServices({ services, check, maxWait: 0, log: noop }),
		).rejects.toThrow();
		expect(check).not.toHaveBeenCalled();
	});

	it("treats an empty service list as ready", async () => {
		// length 0.
		await expect(waitForServices({ services: [], log: noop })).resolves.toEqual(
			[],
		);
	});

	it("reports the status of each service as it polls", async () => {
		const lines: string[] = [];
		await waitForServices({
			services,
			check: () => Promise.resolve(true),
			log: (message: string) => lines.push(message),
		});
		const output = lines.join("\n");
		expect(output).toContain("One - https://one.test");
		expect(output).toContain("All services are ready");
	});

	it("ships the four dev services the cypress runs depend on", () => {
		expect(defaultServices.map((service) => service.name)).toEqual([
			"Admin API",
			"Bundle Server",
			"Client Bundle",
			"Example Server",
		]);
	});
});
