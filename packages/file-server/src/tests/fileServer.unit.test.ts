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

// Testing strategy: run the real express app on an ephemeral port and drive it
// with real HTTP requests, so routing, static serving and streaming are
// genuinely exercised. Only the two outward-facing collaborators — the remote
// fetch and the image resize — are faked, since they are the things that go
// wrong in production (a remote being down, a corrupt image) and the things a
// unit test must not actually perform.

import fs from "node:fs";
import type http from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	DEFAULT_PORT,
	type FetchFn,
	type FileServerDeps,
	type FileServerEnv,
	type Logger,
	type ResizeFn,
	createApp,
	defaultDeps,
	getEnv,
	main,
	parseArray,
	sharpResize,
	toInt,
} from "../index.js";

/** Logger that records each call as a flat string for easy assertion. */
const createRecordingLogger = (): Logger & {
	info: (...args: unknown[]) => void;
	entries: string[];
} => {
	const entries: string[] = [];
	const record =
		(level: string) =>
		(...args: unknown[]): void => {
			entries.push(`${level} ${args.map((arg) => String(arg)).join(" ")}`);
		};
	return {
		entries,
		info: record("info"),
		warn: record("warn"),
		error: record("error"),
	};
};

const baseEnv = (overrides: Partial<FileServerEnv> = {}): FileServerEnv => ({
	port: 0,
	paths: [],
	resize: undefined,
	remotes: [],
	logLevel: "info",
	...overrides,
});

/** A fetch that returns the given body with a 200. */
const okFetch = (body: string): FetchFn => {
	return (): Promise<Response> =>
		Promise.resolve(new Response(body, { status: 200 }));
};

const notFoundFetch: FetchFn = (): Promise<Response> =>
	Promise.resolve(new Response("", { status: 404 }));

const throwingFetch: FetchFn = (): Promise<Response> =>
	Promise.reject(new Error("connection refused"));

const identityResize: ResizeFn = (image: Buffer): Promise<Buffer> =>
	Promise.resolve(image);

const makeDeps = (overrides: Partial<FileServerDeps> = {}): FileServerDeps => ({
	logger: createRecordingLogger(),
	fetch: notFoundFetch,
	resize: identityResize,
	...overrides,
});

const servers: http.Server[] = [];
let tmpDir: string;
let envSnapshot: NodeJS.ProcessEnv;

/** Start an app on an ephemeral port and return its base URL. */
const serve = async (
	env: FileServerEnv,
	deps: FileServerDeps,
): Promise<string> => {
	const app = createApp(env, deps);
	const server = await new Promise<http.Server>((resolve) => {
		const started = app.listen(0, "127.0.0.1", () => {
			resolve(started);
		});
	});
	servers.push(server);
	const address: string | AddressInfo | null = server.address();
	if (address === null || typeof address === "string") {
		throw new Error("expected a TCP address");
	}
	return `http://127.0.0.1:${address.port}`;
};

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "prosopo-file-server-test-"));
	envSnapshot = { ...process.env };
});

afterEach(async () => {
	for (const server of servers.splice(0)) {
		server.closeAllConnections();
		await new Promise<void>((resolve) => {
			server.close(() => {
				resolve();
			});
		});
	}
	fs.rmSync(tmpDir, { recursive: true, force: true });
	for (const key of Object.keys(process.env)) {
		delete process.env[key];
	}
	Object.assign(process.env, envSnapshot);
});

describe("parseArray", () => {
	it("parses a JSON array of strings", () => {
		expect(parseArray('["/a","/b"]')).toEqual(["/a", "/b"]);
	});

	it("returns an empty array for an empty JSON array", () => {
		expect(parseArray("[]")).toEqual([]);
	});

	it("treats unparseable text as a single entry", () => {
		expect(parseArray("/srv/images")).toEqual(["/srv/images"]);
	});

	it("treats an empty string as a single empty entry", () => {
		expect(parseArray("")).toEqual([""]);
	});

	it("treats a JSON scalar as a single entry", () => {
		// Without this guard a bare number would be returned as-is and then
		// iterated, throwing on startup.
		expect(parseArray("5")).toEqual(["5"]);
		expect(parseArray("null")).toEqual(["null"]);
		expect(parseArray("true")).toEqual(["true"]);
	});

	it("treats a JSON object as a single entry", () => {
		expect(parseArray('{"a":1}')).toEqual(['{"a":1}']);
	});

	it("treats a mixed-type array as a single entry", () => {
		expect(parseArray('["/a",1]')).toEqual(['["/a",1]']);
	});

	it("keeps a nested-looking string intact", () => {
		expect(parseArray('"just a string"')).toEqual(['"just a string"']);
	});
});

describe("toInt", () => {
	it("returns a number unchanged", () => {
		expect(toInt(128)).toBe(128);
	});

	it("returns undefined when unset", () => {
		expect(toInt(undefined)).toBeUndefined();
	});

	it("parses a numeric string", () => {
		expect(toInt("128")).toBe(128);
	});

	it("parses a leading numeric prefix, as parseInt does", () => {
		expect(toInt("128px")).toBe(128);
	});

	it("returns undefined rather than NaN for unparseable text", () => {
		expect(toInt("abc")).toBeUndefined();
		expect(toInt("")).toBeUndefined();
	});

	it("truncates a fractional value", () => {
		expect(toInt("128.9")).toBe(128);
	});

	it("returns zero for zero", () => {
		// getEnv then maps 0 to undefined via `|| undefined`, disabling resize.
		expect(toInt("0")).toBe(0);
	});

	it("handles a negative value", () => {
		expect(toInt("-1")).toBe(-1);
	});
});

describe("getEnv", () => {
	it("falls back to defaults when nothing is set", () => {
		const env = getEnv({});
		expect(env.port).toBe(DEFAULT_PORT);
		expect(env.paths).toEqual([]);
		expect(env.remotes).toEqual([]);
		expect(env.resize).toBeUndefined();
		expect(env.logLevel).toBe("info");
	});

	it("reads every value from the environment", () => {
		const env = getEnv({
			PROSOPO_FILE_SERVER_PORT: "4000",
			PROSOPO_FILE_SERVER_PATHS: '["/a"]',
			PROSOPO_FILE_SERVER_REMOTES: '["http://x"]',
			PROSOPO_FILE_SERVER_RESIZE: "64",
			PROSOPO_LOG_LEVEL: "debug",
		});
		expect(env).toEqual({
			port: "4000",
			paths: ["/a"],
			remotes: ["http://x"],
			resize: 64,
			logLevel: "debug",
		});
	});

	it("treats a resize of 0 as no resize", () => {
		expect(getEnv({ PROSOPO_FILE_SERVER_RESIZE: "0" }).resize).toBeUndefined();
	});

	it("treats an unparseable resize as no resize", () => {
		// Silent: a typo in the resize var disables resizing rather than failing.
		expect(
			getEnv({ PROSOPO_FILE_SERVER_RESIZE: "big" }).resize,
		).toBeUndefined();
	});

	it("treats an empty port as unset", () => {
		expect(getEnv({ PROSOPO_FILE_SERVER_PORT: "" }).port).toBe(DEFAULT_PORT);
	});

	it("leaves the port as a string when set", () => {
		// Never coerced, so a non-numeric port reaches listen() untouched.
		expect(getEnv({ PROSOPO_FILE_SERVER_PORT: "4000" }).port).toBe("4000");
	});

	it("does not mutate process.env when a custom env is supplied", () => {
		// dotenv writes into process.env and cannot populate an arbitrary object,
		// so loading it for an injected env would be a side effect with no effect.
		process.env.NODE_ENV = "test";
		const before = { ...process.env };

		getEnv({ PROSOPO_FILE_SERVER_PORT: "4000" });

		expect({ ...process.env }).toEqual(before);
	});

	it("reads process.env when no env is supplied", () => {
		process.env.PROSOPO_FILE_SERVER_PORT = "4321";

		expect(getEnv().port).toBe("4321");
	});

	it("falls back to the unsuffixed .env when NODE_ENV is unset", () => {
		// Assigning undefined would store the string "undefined", so remove it.
		Reflect.deleteProperty(process.env, "NODE_ENV");
		process.env.PROSOPO_FILE_SERVER_PORT = "4322";

		expect(getEnv().port).toBe("4322");
	});
});

describe("createApp static serving", () => {
	it("serves a file from a configured path", async () => {
		fs.writeFileSync(path.join(tmpDir, "a.txt"), "hello");
		const url = await serve(baseEnv({ paths: [tmpDir] }), makeDeps());

		const response = await fetch(`${url}/a.txt`);

		expect(response.status).toBe(200);
		expect(await response.text()).toBe("hello");
	});

	it("logs each path it serves", async () => {
		const logger = createRecordingLogger();
		await serve(baseEnv({ paths: [tmpDir] }), makeDeps({ logger }));
		expect(logger.entries).toContain(`info Serving files from ${tmpDir}`);
	});

	it("falls through to the remote handler for a missing file", async () => {
		const url = await serve(
			baseEnv({ paths: [tmpDir] }),
			makeDeps({ fetch: notFoundFetch }),
		);

		const response = await fetch(`${url}/missing.txt`);

		expect(response.status).toBe(404);
		expect(await response.text()).toBe("Not found");
	});

	it("serves from the first path that has the file", async () => {
		const other = fs.mkdtempSync(path.join(os.tmpdir(), "prosopo-fs-second-"));
		try {
			fs.writeFileSync(path.join(tmpDir, "same.txt"), "first");
			fs.writeFileSync(path.join(other, "same.txt"), "second");
			const url = await serve(baseEnv({ paths: [tmpDir, other] }), makeDeps());

			expect(await (await fetch(`${url}/same.txt`)).text()).toBe("first");
		} finally {
			fs.rmSync(other, { recursive: true, force: true });
		}
	});

	it("tolerates a path that does not exist", async () => {
		// express.static does not stat the root up front, so a typo'd path is a
		// silent no-op rather than a startup failure.
		const url = await serve(
			baseEnv({ paths: [path.join(tmpDir, "nope")] }),
			makeDeps(),
		);

		expect((await fetch(`${url}/a.txt`)).status).toBe(404);
	});

	it("404s everything when no paths and no remotes are configured", async () => {
		const url = await serve(baseEnv(), makeDeps());
		expect((await fetch(`${url}/anything`)).status).toBe(404);
	});
});

describe("createApp remote fallback", () => {
	it("streams back the first remote that has the file", async () => {
		const url = await serve(
			baseEnv({ remotes: ["http://remote-a"] }),
			makeDeps({ fetch: okFetch("image-bytes") }),
		);

		const response = await fetch(`${url}/a.jpg`);

		expect(response.status).toBe(200);
		expect(await response.text()).toBe("image-bytes");
	});

	it("requests the remote with the original url appended", async () => {
		const requested: string[] = [];
		const recordingFetch: FetchFn = (target: string): Promise<Response> => {
			requested.push(target);
			return Promise.resolve(new Response("x", { status: 200 }));
		};
		const url = await serve(
			baseEnv({ remotes: ["http://remote-a"] }),
			makeDeps({ fetch: recordingFetch }),
		);

		await fetch(`${url}/nested/a.jpg?v=1`);

		expect(requested).toEqual(["http://remote-a/nested/a.jpg?v=1"]);
	});

	it("tries each remote in order until one hits", async () => {
		const requested: string[] = [];
		const secondWins: FetchFn = (target: string): Promise<Response> => {
			requested.push(target);
			return Promise.resolve(
				new Response("found", {
					status: target.startsWith("http://b") ? 200 : 404,
				}),
			);
		};
		const url = await serve(
			baseEnv({ remotes: ["http://a", "http://b", "http://c"] }),
			makeDeps({ fetch: secondWins }),
		);

		const response = await fetch(`${url}/a.jpg`);

		expect(await response.text()).toBe("found");
		// c is never tried once b answers.
		expect(requested).toEqual(["http://a/a.jpg", "http://b/a.jpg"]);
	});

	it("404s when every remote misses", async () => {
		const url = await serve(
			baseEnv({ remotes: ["http://a", "http://b"] }),
			makeDeps({ fetch: notFoundFetch }),
		);

		const response = await fetch(`${url}/a.jpg`);

		expect(response.status).toBe(404);
		expect(await response.text()).toBe("Not found");
	});

	it("skips a remote that is unavailable and tries the next", async () => {
		const flaky: FetchFn = (target: string): Promise<Response> =>
			target.startsWith("http://down")
				? Promise.reject(new Error("connection refused"))
				: Promise.resolve(new Response("ok", { status: 200 }));
		const logger = createRecordingLogger();
		const url = await serve(
			baseEnv({ remotes: ["http://down", "http://up"] }),
			makeDeps({ fetch: flaky, logger }),
		);

		const response = await fetch(`${url}/a.jpg`);

		expect(await response.text()).toBe("ok");
		expect(
			logger.entries.some((entry) =>
				entry.startsWith("warn error http://down"),
			),
		).toBe(true);
	});

	it("404s when every remote is unavailable", async () => {
		const url = await serve(
			baseEnv({ remotes: ["http://a"] }),
			makeDeps({ fetch: throwingFetch }),
		);

		expect((await fetch(`${url}/a.jpg`)).status).toBe(404);
	});

	it("logs the remote status on a miss", async () => {
		const logger = createRecordingLogger();
		const url = await serve(
			baseEnv({ remotes: ["http://a"] }),
			makeDeps({ fetch: notFoundFetch, logger }),
		);

		await fetch(`${url}/a.jpg`);

		expect(logger.entries).toContain("warn not found http://a /a.jpg 404");
	});

	it("treats a 500 from a remote as a miss", async () => {
		const serverError: FetchFn = (): Promise<Response> =>
			Promise.resolve(new Response("boom", { status: 500 }));
		const url = await serve(
			baseEnv({ remotes: ["http://a"] }),
			makeDeps({ fetch: serverError }),
		);

		expect((await fetch(`${url}/a.jpg`)).status).toBe(404);
	});

	it("skips a remote whose body cannot be read", async () => {
		const brokenBody: FetchFn = (): Promise<Response> => {
			const response = new Response("x", { status: 200 });
			return Promise.resolve(
				Object.assign(response, {
					arrayBuffer: (): Promise<ArrayBuffer> =>
						Promise.reject(new Error("stream aborted")),
				}),
			);
		};
		const logger = createRecordingLogger();
		const url = await serve(
			baseEnv({ remotes: ["http://a"] }),
			makeDeps({ fetch: brokenBody, logger }),
		);

		expect((await fetch(`${url}/a.jpg`)).status).toBe(404);
		expect(
			logger.entries.some((entry) => entry.includes("stream aborted")),
		).toBe(true);
	});

	it("serves an empty remote body as an empty response", async () => {
		const url = await serve(
			baseEnv({ remotes: ["http://a"] }),
			makeDeps({ fetch: okFetch("") }),
		);

		const response = await fetch(`${url}/a.jpg`);

		expect(response.status).toBe(200);
		expect(await response.text()).toBe("");
	});
});

describe("createApp resizing", () => {
	it("resizes when a size is configured", async () => {
		const calls: number[] = [];
		const resize: ResizeFn = (
			_image: Buffer,
			size: number,
		): Promise<Buffer> => {
			calls.push(size);
			return Promise.resolve(Buffer.from("resized"));
		};
		const url = await serve(
			baseEnv({ remotes: ["http://a"], resize: 64 }),
			makeDeps({ fetch: okFetch("original"), resize }),
		);

		const response = await fetch(`${url}/a.jpg`);

		expect(await response.text()).toBe("resized");
		expect(calls).toEqual([64]);
	});

	it("does not resize when no size is configured", async () => {
		const calls: number[] = [];
		const resize: ResizeFn = (image: Buffer, size: number): Promise<Buffer> => {
			calls.push(size);
			return Promise.resolve(image);
		};
		const url = await serve(
			baseEnv({ remotes: ["http://a"] }),
			makeDeps({ fetch: okFetch("original"), resize }),
		);

		expect(await (await fetch(`${url}/a.jpg`)).text()).toBe("original");
		expect(calls).toEqual([]);
	});

	it("skips a remote whose payload cannot be resized", async () => {
		// Without the guard this rejection would escape an async express 4
		// handler, leaving the client hanging until it timed out.
		const failing: ResizeFn = (): Promise<Buffer> =>
			Promise.reject(new Error("unsupported image format"));
		const logger = createRecordingLogger();
		const url = await serve(
			baseEnv({ remotes: ["http://a"], resize: 64 }),
			makeDeps({ fetch: okFetch("not-an-image"), resize: failing, logger }),
		);

		const response = await fetch(`${url}/a.jpg`);

		expect(response.status).toBe(404);
		expect(
			logger.entries.some((entry) => entry.startsWith("warn resize failed")),
		).toBe(true);
	});

	it("falls through to a later remote when the first cannot be resized", async () => {
		const failFirst: ResizeFn = (image: Buffer): Promise<Buffer> =>
			image.toString() === "bad"
				? Promise.reject(new Error("unsupported image format"))
				: Promise.resolve(Buffer.from("resized"));
		const byRemote: FetchFn = (target: string): Promise<Response> =>
			Promise.resolve(
				new Response(target.startsWith("http://a") ? "bad" : "good", {
					status: 200,
				}),
			);
		const url = await serve(
			baseEnv({ remotes: ["http://a", "http://b"], resize: 64 }),
			makeDeps({ fetch: byRemote, resize: failFirst }),
		);

		expect(await (await fetch(`${url}/a.jpg`)).text()).toBe("resized");
	});
});

describe("defaultDeps", () => {
	it("wires up the console and the sharp-backed resize", () => {
		const deps = defaultDeps();
		expect(deps.logger).toBe(console);
		expect(deps.resize).toBe(sharpResize);
		expect(typeof deps.fetch).toBe("function");
	});

	it("delegates fetch to the global implementation", async () => {
		const url = await serve(baseEnv({ paths: [tmpDir] }), makeDeps());
		fs.writeFileSync(path.join(tmpDir, "real.txt"), "via-global-fetch");

		const response = await defaultDeps().fetch(`${url}/real.txt`);

		expect(await response.text()).toBe("via-global-fetch");
	});
});

describe("main", () => {
	it("starts a server from the environment and logs the port", async () => {
		process.env.PROSOPO_FILE_SERVER_PORT = "0";
		process.env.PROSOPO_FILE_SERVER_PATHS = JSON.stringify([tmpDir]);
		process.env.PROSOPO_FILE_SERVER_REMOTES = "[]";
		fs.writeFileSync(path.join(tmpDir, "b.txt"), "from-main");
		const logger = createRecordingLogger();

		const server = await main(makeDeps({ logger }));
		servers.push(server);

		const address: string | AddressInfo | null = server.address();
		if (address === null || typeof address === "string") {
			throw new Error("expected a TCP address");
		}
		const response = await fetch(`http://127.0.0.1:${address.port}/b.txt`);

		expect(await response.text()).toBe("from-main");
		expect(logger.entries).toContain("info File server running on port 0");
	});
});

describe("sharpResize", () => {
	it("resizes a real image to the requested square", async () => {
		const source = await sharpResizeSource();

		const resized = await sharpResize(source, 32);

		const { default: sharp } = await import("sharp");
		const metadata = await sharp(resized).metadata();
		expect(metadata.width).toBe(32);
		expect(metadata.height).toBe(32);
	});

	it("rejects a payload that is not an image", async () => {
		await expect(
			sharpResize(Buffer.from("definitely not an image"), 32),
		).rejects.toThrow();
	});
});

/** A small real PNG to feed the resize tests. */
const sharpResizeSource = async (): Promise<Buffer> => {
	const { default: sharp } = await import("sharp");
	return sharp({
		create: {
			width: 8,
			height: 16,
			channels: 3,
			background: { r: 255, g: 0, b: 0 },
		},
	})
		.png()
		.toBuffer();
};
