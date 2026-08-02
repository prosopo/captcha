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

import path from "node:path";
import { fileURLToPath } from "node:url";
import { ClientApiPaths } from "@prosopo/types";
import type { Request, Response } from "express";
import { afterEach, describe, expect, test, vi } from "vitest";
import {
	type ApiNext,
	type ApiRequest,
	type ApiResponse,
	DEFAULT_MONGO_AUTH_SOURCE,
	DEFAULT_MONGO_DBNAME,
	DEFAULT_MONGO_URL,
	type RouterDeps,
	createDatabase,
	defaultRouterDeps,
	prosopoRouter,
	toRequestHandler,
} from "../api.js";
import { JA4Database } from "../db.js";
import { isMain } from "../isMain.js";
import { defaultStartDeps } from "../start.js";
import { createDeps, createRequest, createResponse } from "./fixtures.js";

afterEach(() => {
	vi.restoreAllMocks();
});

describe("createDatabase", () => {
	test("falls back to a local mongo when nothing is configured", () => {
		const db: JA4Database = createDatabase({});
		expect(db).toBeInstanceOf(JA4Database);
		expect(db.url).toContain("localhost:27017");
		expect(db.url).toContain(`authSource=${DEFAULT_MONGO_AUTH_SOURCE}`);
		expect(db.dbname).toBe(DEFAULT_MONGO_DBNAME);
	});

	test("uses the configured connection", () => {
		const db = createDatabase({
			MONGO_URL: "mongodb://mongo:27018",
			MONGO_DBNAME: "other",
			MONGO_AUTH_SOURCE: "users",
		});
		expect(db.url).toContain("mongo:27018");
		expect(db.dbname).toBe("other");
		expect(db.url).toContain("authSource=users");
	});

	test("an empty value is treated as unset, not as an empty url", () => {
		// An empty MONGO_URL in a compose file is how "not configured" is usually
		// spelt; passing it through would produce an unparseable url.
		const db = createDatabase({
			MONGO_URL: "",
			MONGO_DBNAME: "",
			MONGO_AUTH_SOURCE: "",
		});
		expect(db.url).toContain(DEFAULT_MONGO_URL.replace("mongodb://", ""));
		expect(db.dbname).toBe(DEFAULT_MONGO_DBNAME);
	});

	test("credentials are kept out of the logged url", () => {
		const db = createDatabase({
			MONGO_URL: "mongodb://user:secret@mongo:27017",
		});
		expect(db.safeURL).not.toContain("secret");
	});

	test("defaults to the process environment", () => {
		expect(createDatabase()).toBeInstanceOf(JA4Database);
	});

	test("does not connect on construction", () => {
		// Building the router must not need mongo to be up, or the mock would
		// refuse to start before its database container was ready.
		const connect = vi.spyOn(JA4Database.prototype, "connect");
		createDatabase({});
		expect(connect).not.toHaveBeenCalled();
	});
});

describe("defaultRouterDeps", () => {
	test("supplies every dependency the handlers use", () => {
		const deps: RouterDeps = defaultRouterDeps();
		expect(deps.db).toBeInstanceOf(JA4Database);
		expect(typeof deps.getJA4).toBe("function");
		expect(typeof deps.decodeToken).toBe("function");
		expect(typeof deps.logger.error).toBe("function");
	});

	test("builds a fresh set each time", () => {
		expect(defaultRouterDeps().db).not.toBe(defaultRouterDeps().db);
	});
});

interface RouteLayer {
	route?: { path: string; methods: Record<string, boolean> };
}

const routesOf = (router: ReturnType<typeof prosopoRouter>): string[] => {
	// express types its stack as ILayer, which does not describe route.methods.
	const layers: RouteLayer[] = router.stack.map(
		(layer: unknown): RouteLayer => layer as RouteLayer,
	);
	return layers
		.map((layer) =>
			layer.route === undefined
				? undefined
				: `${Object.keys(layer.route.methods).join(",")} ${layer.route.path}`,
		)
		.filter((route): route is string => route !== undefined);
};

describe("prosopoRouter", () => {
	test("mounts the verify and test routes, and nothing else", () => {
		const router = prosopoRouter(createDeps().deps);
		expect(routesOf(router)).toEqual([
			`post ${ClientApiPaths.VerifyImageCaptchaSolutionDapp}`,
			"get /test",
		]);
	});

	test("builds its own dependencies when it is given none", () => {
		expect(routesOf(prosopoRouter())).toHaveLength(2);
	});

	test("does not touch the database while being built", async () => {
		const mocks = createDeps();
		prosopoRouter(mocks.deps);
		expect(mocks.database.connect).not.toHaveBeenCalled();
	});
});

describe("toRequestHandler", () => {
	test("passes express's own request, response and next straight through", () => {
		const seen: unknown[] = [];
		const handler = vi.fn<
			(req: ApiRequest, res: ApiResponse, next: ApiNext) => Promise<void>
		>(async (req, res, next) => {
			seen.push(req, res, next);
		});
		const req = createRequest();
		const response = createResponse();
		const next: ApiNext = () => undefined;
		toRequestHandler(handler)(
			req as unknown as Request,
			response.res as unknown as Response,
			next,
		);
		expect(seen).toEqual([req, response.res, next]);
	});

	test("returns void, so express does not wait on the promise", () => {
		// Express ignores a returned promise; the adapter must not hand it one and
		// pretend otherwise.
		const handler = async (): Promise<void> => undefined;
		expect(
			toRequestHandler(handler)(
				createRequest() as unknown as Request,
				createResponse().res as unknown as Response,
				(): void => undefined,
			),
		).toBeUndefined();
	});

	test("a rejecting handler is reported to next, not left unhandled", async () => {
		// Express ignores the returned promise, so without this the request would
		// hang until the client gave up and the process would log an unhandled
		// rejection.
		const failure = new Error("boom");
		const handler = async (): Promise<void> => {
			throw failure;
		};
		const errors: unknown[] = [];
		toRequestHandler(handler)(
			createRequest() as unknown as Request,
			createResponse().res as unknown as Response,
			(error: unknown): void => {
				errors.push(error);
			},
		);
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(errors).toEqual([failure]);
	});
});

describe("isMain", () => {
	test("is true for the module node was asked to run", () => {
		expect(
			isMain(`file://${path.resolve("/tmp/start.js")}`, "/tmp/start.js"),
		).toBe(true);
	});

	test("is false for a module that was merely imported", () => {
		expect(isMain("file:///tmp/api.js", "/tmp/start.js")).toBe(false);
	});

	test("is false when there is no entrypoint at all", () => {
		// argv[1] is absent when node is run with -e or from a REPL; assuming a
		// match there would start a server inside somebody else's process.
		// Passing undefined explicitly would fall back to the default, so the
		// only way to exercise this is to take argv[1] away.
		const [, entrypoint] = process.argv;
		process.argv.splice(1, 1);
		try {
			expect(isMain("file:///tmp/start.js")).toBe(false);
		} finally {
			if (entrypoint !== undefined) {
				process.argv.splice(1, 0, entrypoint);
			}
		}
	});

	test("reads the entrypoint from argv when it is not given one", () => {
		expect(isMain(import.meta.url)).toBe(false);
	});
});

describe("defaultStartDeps", () => {
	test("creates a real express app", () => {
		const app = defaultStartDeps().createApp();
		expect(typeof app.use).toBe("function");
		expect(typeof app.listen).toBe("function");
	});

	test("its exit ends the process with the code it is given", () => {
		const exit = vi
			.spyOn(process, "exit")
			.mockImplementation((): never => undefined as never);
		defaultStartDeps().exit(1);
		expect(exit).toHaveBeenCalledWith(1);
	});

	test("its i18n resolves to a middleware function", async () => {
		expect(typeof (await defaultStartDeps().i18n())).toBe("function");
	});
});

describe("the package entrypoint", () => {
	test("importing the package does not start the api", () => {
		// start.ts used to call startApi() at module scope, so importing
		// anything from the package started a server. It is now behind
		// isMain(import.meta.url), and under a test runner argv[1] is the
		// runner rather than start.ts, so the guard does not fire.
		//
		// Asserting the guard rather than probing the port: the port test only
		// held while nothing else was bound, and CI runs the real provider
		// alongside the suite.
		const startUrl = new URL("../start.js", import.meta.url).href;
		expect(isMain(startUrl)).toBe(false);
		expect(isMain(startUrl, fileURLToPath(startUrl))).toBe(true);
	});
});
