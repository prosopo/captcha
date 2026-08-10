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
import express from "express";
import type { Connection } from "mongoose";
import { afterEach, describe, expect, test, vi } from "vitest";
import getRoutes from "../routes/routes.js";
import { VERIFY_ENDPOINT, serverConfig } from "./authHarness.js";

/**
 * The controllers have their own suite; here we only care that each path is
 * bound to the right handler and that the bound arguments reach it.
 */
const mocks = vi.hoisted(() => ({
	calls: [] as { handler: string; args: unknown[] }[],
}));

vi.mock("../controllers/auth.js", () => {
	type Handler = (...args: unknown[]) => void;
	const record =
		(handler: string): Handler =>
		(...args: unknown[]) => {
			mocks.calls.push({ handler, args: args.slice(0, 4) });
			const res = args[args.length - 2] as {
				status: (code: number) => { json: (body: unknown) => void };
			};
			res.status(200).json({ handler });
		};
	return {
		signup: record("signup"),
		login: record("login"),
		// isAuth is mounted directly, so it only ever gets (req, res).
		isAuth: (_req: unknown, res: unknown) =>
			(res as { status: (code: number) => { json: (body: unknown) => void } })
				.status(200)
				.json({ handler: "isAuth" }),
	};
});

const connection: Connection = {} as unknown as Connection;

let server: Server | undefined;

const listen = (): Promise<string> => {
	const app = express();
	app.use(express.json());
	app.use(getRoutes(connection, serverConfig(), VERIFY_ENDPOINT, "api"));
	return new Promise((resolve) => {
		server = app.listen(0, () => {
			const { port } = server?.address() as AddressInfo;
			resolve(`http://127.0.0.1:${port}`);
		});
	});
};

afterEach(async () => {
	mocks.calls.length = 0;
	await new Promise<void>((resolve) => {
		if (!server) return resolve();
		server.close(() => resolve());
		server = undefined;
	});
});

describe("the router", () => {
	test("serves the public resource without any authentication", async () => {
		const base = await listen();
		const response = await fetch(`${base}/public`);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			message: "here is your public resource",
		});
	});

	test("answers health checks", async () => {
		const base = await listen();
		const response = await fetch(`${base}/health`);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ status: "ok" });
	});

	test("routes a signup to the signup handler, with the bound context", async () => {
		const base = await listen();
		const response = await fetch(`${base}/signup`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ email: "user@example.com" }),
		});
		expect(response.status).toBe(200);
		expect(mocks.calls[0]?.handler).toBe("signup");
		expect(mocks.calls[0]?.args).toEqual([
			connection,
			serverConfig(),
			VERIFY_ENDPOINT,
			"api",
		]);
	});

	test("routes a login to the login handler", async () => {
		const base = await listen();
		await fetch(`${base}/login`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({}),
		});
		expect(mocks.calls[0]?.handler).toBe("login");
	});

	test("guards the private resource", async () => {
		const base = await listen();
		const response = await fetch(`${base}/private`);
		expect(await response.json()).toEqual({ handler: "isAuth" });
	});

	test("answers anything else with a 404 body, not express's HTML", async () => {
		const base = await listen();
		const response = await fetch(`${base}/nope`);
		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: "page not found" });
	});

	test("a GET to a POST-only path falls through to the catch-all", async () => {
		const base = await listen();
		const response = await fetch(`${base}/login`);
		expect(response.status).toBe(404);
		expect(mocks.calls).toHaveLength(0);
	});

	test("each call builds a fresh router", async () => {
		// The module used to share one router across calls, so a second server
		// stacked a second set of handlers on top of the first call's bound
		// config and answered every request with the stale one.
		const first = getRoutes(connection, serverConfig(), "https://one", "api");
		const second = getRoutes(connection, serverConfig(), "https://two", "api");
		expect(first).not.toBe(second);
		const app = express();
		app.use(express.json());
		app.use(second);
		const base = await new Promise<string>((resolve) => {
			server = app.listen(0, () => {
				const { port } = server?.address() as AddressInfo;
				resolve(`http://127.0.0.1:${port}`);
			});
		});
		await fetch(`${base}/signup`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({}),
		});
		expect(mocks.calls).toHaveLength(1);
		expect(mocks.calls[0]?.args[2]).toBe("https://two");
	});
});
