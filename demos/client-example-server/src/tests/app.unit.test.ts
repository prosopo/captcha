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

import fs from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import type { ProsopoServerConfigOutput } from "@prosopo/types";
import express from "express";
import type { Connection } from "mongoose";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
	DEFAULT_PORT,
	ProsopoVerificationType,
	createApp,
	isDevelopmentOrTest,
	main,
	resolvePort,
	resolveVerifyEndpoint,
	resolveVerifyType,
	startServer,
} from "../app.js";
import { serverConfig } from "./authHarness.js";

/**
 * main() opens a mongo connection and reads the deployment config; both are
 * replaced. The express wiring, the endpoint/port resolution and the HTTP vs
 * HTTPS decision are exercised for real.
 */
const mocks = vi.hoisted(() => ({
	memoryUris: [] as string[],
	memorySetup: vi.fn(),
	connections: [] as string[],
	routesArgs: [] as unknown[][],
	config: {} as ProsopoServerConfigOutput,
}));

vi.mock("../utils/database.js", () => ({
	default: () => {
		mocks.memorySetup();
		return Promise.resolve("mongodb://memory:27017/");
	},
}));

vi.mock("../utils/connection.js", () => ({
	default: (uri: string) => {
		mocks.connections.push(uri);
		return {} as unknown as Connection;
	},
}));

vi.mock("../routes/routes.js", () => ({
	default: (...args: unknown[]) => {
		mocks.routesArgs.push(args);
		return express.Router();
	},
}));

vi.mock("@prosopo/server", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@prosopo/server")>();
	return {
		...actual,
		getServerConfig: () => mocks.config,
	};
});

vi.mock("@prosopo/dotenv", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@prosopo/dotenv")>();
	return {
		...actual,
		// The real loadEnv walks the repo for .env files; irrelevant here and
		// it would overwrite the env each test sets up.
		loadEnv: () => undefined,
	};
});

const servers: Server[] = [];

const track = (server: Server): Server => {
	servers.push(server);
	return server;
};

const env = { ...process.env };

beforeEach(() => {
	mocks.memorySetup.mockClear();
	mocks.memoryUris.length = 0;
	mocks.connections.length = 0;
	mocks.routesArgs.length = 0;
	mocks.config = serverConfig();
	process.env.NODE_ENV = "test";
	process.env.MONGO_URI = "mongodb://configured:27017/";
	process.env.PROSOPO_SITE_PRIVATE_KEY = "//Alice";
	Reflect.deleteProperty(process.env, "PROSOPO_VERIFY_ENDPOINT");
	Reflect.deleteProperty(process.env, "PROSOPO_VERIFICATION_TYPE");
});

afterEach(async () => {
	await Promise.all(
		servers.splice(0).map(
			(server) =>
				new Promise<void>((resolve) => {
					server.close(() => resolve());
				}),
		),
	);
	for (const key of Object.keys(process.env)) {
		if (!(key in env)) Reflect.deleteProperty(process.env, key);
	}
	Object.assign(process.env, env);
	vi.restoreAllMocks();
});

describe("resolveVerifyEndpoint", () => {
	test("prefers an explicitly configured endpoint", () => {
		process.env.PROSOPO_VERIFY_ENDPOINT = "https://self-hosted/siteverify";
		expect(resolveVerifyEndpoint()).toBe("https://self-hosted/siteverify");
	});

	test("prefixes the hosted API with the environment name", () => {
		process.env.NODE_ENV = "staging";
		expect(resolveVerifyEndpoint()).toBe(
			"https://staging-api.prosopo.io/siteverify",
		);
	});

	test("uses the bare hosted API in production", () => {
		process.env.NODE_ENV = "production";
		expect(resolveVerifyEndpoint()).toBe("https://api.prosopo.io/siteverify");
	});

	test("an unset NODE_ENV falls back to the production host", () => {
		// Prefixing an absent environment produced undefined-api.prosopo.io,
		// which resolves to nothing.
		Reflect.deleteProperty(process.env, "NODE_ENV");
		expect(resolveVerifyEndpoint()).toBe("https://api.prosopo.io/siteverify");
	});

	test("an empty NODE_ENV is treated the same way", () => {
		process.env.NODE_ENV = "";
		expect(resolveVerifyEndpoint()).toBe("https://api.prosopo.io/siteverify");
	});
});

describe("resolveVerifyType", () => {
	test("accepts the verification types it knows", () => {
		process.env.PROSOPO_VERIFICATION_TYPE = "local";
		expect(resolveVerifyType()).toBe(ProsopoVerificationType.local);
		process.env.PROSOPO_VERIFICATION_TYPE = "api";
		expect(resolveVerifyType()).toBe(ProsopoVerificationType.api);
	});

	test("falls back to the hosted API for anything else", () => {
		process.env.PROSOPO_VERIFICATION_TYPE = "carrier-pigeon";
		expect(resolveVerifyType()).toBe(ProsopoVerificationType.api);
	});

	test("falls back to the hosted API when unset", () => {
		expect(resolveVerifyType()).toBe(ProsopoVerificationType.api);
	});
});

describe("isDevelopmentOrTest", () => {
	test("is true only for development and test", () => {
		for (const [value, expected] of [
			["development", true],
			["test", true],
			["production", false],
			["staging", false],
		] as [string, boolean][]) {
			process.env.NODE_ENV = value;
			expect(isDevelopmentOrTest()).toBe(expected);
		}
	});
});

describe("resolvePort", () => {
	test("takes the port from the configured server URL", () => {
		expect(resolvePort(serverConfig())).toBe(9228);
	});

	test("defaults when no server URL is configured", () => {
		const config: ProsopoServerConfigOutput = {
			...serverConfig(),
			serverUrl: "",
		};
		expect(resolvePort(config)).toBe(9228);
	});

	test("defaults on a server URL with no port segment", () => {
		// This used to produce NaN, which node listens on as an arbitrary free
		// port — the server came up somewhere nothing was pointed at.
		const config: ProsopoServerConfigOutput = {
			...serverConfig(),
			serverUrl: "https://localhost",
		};
		expect(resolvePort(config)).toBe(DEFAULT_PORT);
	});

	test("defaults when the port segment isn't a number", () => {
		const config: ProsopoServerConfigOutput = {
			...serverConfig(),
			serverUrl: "https://localhost:https",
		};
		expect(resolvePort(config)).toBe(DEFAULT_PORT);
	});
});

describe("createApp", () => {
	const listen = (app: express.Express): Promise<string> =>
		new Promise((resolve) => {
			const server = track(
				app.listen(0, () => {
					const { port } = server.address() as AddressInfo;
					resolve(`http://127.0.0.1:${port}`);
				}),
			);
		});

	test("sets permissive CORS headers on every response", async () => {
		const app = createApp();
		app.get("/thing", (_req, res) => {
			res.status(200).json({ ok: true });
		});
		const base = await listen(app);
		const response = await fetch(`${base}/thing`);
		expect(response.headers.get("access-control-allow-origin")).toBe("*");
		expect(response.headers.get("access-control-allow-methods")).toContain(
			"POST",
		);
		expect(response.headers.get("access-control-allow-headers")).toContain(
			"Authorization",
		);
	});

	test("answers preflight requests", async () => {
		// cors() answers preflight itself with a 204; the explicit OPTIONS
		// handler this app used to declare could never run.
		const base = await listen(createApp());
		const response = await fetch(`${base}/anything`, { method: "OPTIONS" });
		expect(response.status).toBe(204);
		expect(response.headers.get("access-control-allow-methods")).toContain(
			"POST",
		);
	});

	test("parses JSON bodies", async () => {
		const app = createApp();
		app.post("/echo", (req, res) => {
			res.status(200).json(req.body);
		});
		const base = await listen(app);
		const response = await fetch(`${base}/echo`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ email: "user@example.com" }),
		});
		expect(await response.json()).toEqual({ email: "user@example.com" });
	});

	test("parses form-encoded bodies", async () => {
		const app = createApp();
		app.post("/echo", (req, res) => {
			res.status(200).json(req.body);
		});
		const base = await listen(app);
		const response = await fetch(`${base}/echo`, {
			method: "POST",
			headers: { "content-type": "application/x-www-form-urlencoded" },
			body: "email=user%40example.com",
		});
		expect(await response.json()).toEqual({ email: "user@example.com" });
	});

	test("trusts one proxy hop, so client IPs survive the reverse proxy", () => {
		expect(createApp().get("trust proxy")).toBe(1);
	});
});

describe("startServer", () => {
	const certDir = (): string => {
		const root = fs.mkdtempSync(path.join(os.tmpdir(), "ces-certs-"));
		fs.mkdirSync(path.join(root, "certs"));
		return root;
	};

	test("serves HTTPS in development when the certificates exist", async () => {
		process.env.NODE_ENV = "development";
		const root = certDir();
		// startServer resolves ../../../certs relative to the module, so the
		// fake module directory sits three levels below the cert directory.
		const moduleDir = path.join(root, "certs", "a", "b");
		fs.mkdirSync(moduleDir, { recursive: true });
		const certs = path.join(root, "certs");
		// A throwaway self-signed pair would need openssl; the files only have
		// to exist for the branch, and https.createServer is stubbed.
		fs.writeFileSync(path.join(certs, "server.key"), "key");
		fs.writeFileSync(path.join(certs, "server.crt"), "cert");
		const https = await import("node:https");
		const fake = { listen: vi.fn((_port: number, cb: () => void) => cb()) };
		const createServer = vi
			.spyOn(https.default, "createServer")
			.mockReturnValue(
				fake as unknown as ReturnType<typeof https.createServer>,
			);
		startServer(express(), 1234, path.join(certs, "a", "b"));
		expect(createServer).toHaveBeenCalledTimes(1);
		const options = createServer.mock.calls[0]?.[0] as {
			key: Buffer;
			cert: Buffer;
		};
		expect(options.key.toString()).toBe("key");
		expect(options.cert.toString()).toBe("cert");
		fs.rmSync(root, { recursive: true, force: true });
	});

	test("falls back to HTTP in development when the certificates are missing", async () => {
		process.env.NODE_ENV = "development";
		const server = track(
			startServer(express(), 0, path.join(os.tmpdir(), "no-such-dir")),
		);
		await new Promise<void>((resolve) => {
			if (server.listening) return resolve();
			server.once("listening", () => resolve());
		});
		expect((server.address() as AddressInfo).port).toBeGreaterThan(0);
	});

	test("serves plain HTTP in production, where a proxy terminates TLS", async () => {
		process.env.NODE_ENV = "production";
		const https = await import("node:https");
		const createServer = vi.spyOn(https.default, "createServer");
		const server = track(startServer(express(), 0));
		expect(createServer).not.toHaveBeenCalled();
		expect((server.address() as AddressInfo).port).toBeGreaterThan(0);
	});

	test("the server it returns actually serves the app", async () => {
		process.env.NODE_ENV = "production";
		const app = express();
		app.get("/health", (_req, res) => {
			res.status(200).json({ status: "ok" });
		});
		const server = track(startServer(app, 0));
		await new Promise<void>((resolve) => {
			if (server.listening) return resolve();
			server.once("listening", () => resolve());
		});
		const { port } = server.address() as AddressInfo;
		const response = await fetch(`http://127.0.0.1:${port}/health`);
		expect(await response.json()).toEqual({ status: "ok" });
	});
});

describe("main", () => {
	test("wires the routes with the resolved endpoint and verification type", async () => {
		process.env.PROSOPO_VERIFY_ENDPOINT = "https://self-hosted/siteverify";
		process.env.PROSOPO_VERIFICATION_TYPE = "local";
		mocks.config = { ...serverConfig(), serverUrl: "https://localhost:0" };
		track(await main());
		expect(mocks.routesArgs[0]?.slice(1)).toEqual([
			mocks.config,
			"https://self-hosted/siteverify",
			ProsopoVerificationType.local,
		]);
	});

	test("connects to the configured mongo instance", async () => {
		mocks.config = { ...serverConfig(), serverUrl: "https://localhost:0" };
		track(await main());
		expect(mocks.connections).toEqual(["mongodb://configured:27017/"]);
		expect(mocks.memorySetup).not.toHaveBeenCalled();
	});

	test("starts an in-memory mongo when none is configured", async () => {
		Reflect.deleteProperty(process.env, "MONGO_URI");
		mocks.config = { ...serverConfig(), serverUrl: "https://localhost:0" };
		track(await main());
		expect(mocks.memorySetup).toHaveBeenCalledTimes(1);
		expect(mocks.connections).toEqual(["mongodb://memory:27017/"]);
	});

	test("refuses to run an in-memory database outside development", async () => {
		Reflect.deleteProperty(process.env, "MONGO_URI");
		process.env.NODE_ENV = "production";
		await expect(main()).rejects.toThrow(
			"Cannot run mongo memory when NODE_ENV is neither development nor test",
		);
		expect(mocks.connections).toHaveLength(0);
	});

	test("boots without a site private key, but says so", async () => {
		// The demo server is still useful without one — every signup will just
		// fail verification — so this logs rather than throws.
		Reflect.deleteProperty(process.env, "PROSOPO_SITE_PRIVATE_KEY");
		mocks.config = { ...serverConfig(), serverUrl: "https://localhost:0" };
		const server = track(await main());
		expect(server.listening).toBe(true);
	});

	test("listens on the port the config names", async () => {
		mocks.config = { ...serverConfig(), serverUrl: "https://localhost:0" };
		const server = track(await main());
		expect((server.address() as AddressInfo).port).toBeGreaterThan(0);
	});

	test("propagates a database connection failure instead of listening", async () => {
		mocks.config = { ...serverConfig(), serverUrl: "https://localhost:0" };
		const connection = await import("../utils/connection.js");
		vi.spyOn(connection, "default").mockImplementation(() => {
			throw new Error("mongo unreachable");
		});
		await expect(main()).rejects.toThrow("mongo unreachable");
	});
});
