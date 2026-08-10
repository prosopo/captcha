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
import type { Server } from "node:http";
import { getLogger } from "@prosopo/logger";
import type { Express, RequestHandler } from "express";
import {
	type Mock,
	afterEach,
	beforeEach,
	describe,
	expect,
	test,
	vi,
} from "vitest";
import {
	DEFAULT_API_PORT,
	type StartDeps,
	defaultStartDeps,
	main,
	readPort,
	startApi,
} from "../start.js";

interface AppMock {
	use: Mock<(handler: unknown) => Express>;
	listen: Mock<(port: number) => Server>;
	/** Make the next listen() report a failed bind instead of a live socket. */
	failWith: (error: Error) => void;
	app: Express;
}

const createAppMock = (): AppMock => {
	const use = vi.fn<(handler: unknown) => Express>();
	// startApi waits on the server's events, so the mock has to be a real
	// emitter rather than a callback: a bind failure only ever arrives as an
	// "error" event.
	let failure: Error | undefined;
	const listen = vi.fn<(port: number) => Server>(() => {
		const server = new EventEmitter();
		setImmediate(() => {
			server.emit(failure ? "error" : "listening", failure);
		});
		return server as unknown as Server;
	});
	const app = { use, listen } as unknown as Express;
	use.mockReturnValue(app);
	return {
		use,
		listen,
		failWith: (error: Error): void => {
			failure = error;
		},
		app,
	};
};

interface StartMocks {
	deps: StartDeps;
	app: AppMock;
	i18n: Mock<() => Promise<RequestHandler>>;
	router: Mock<() => ReturnType<StartDeps["router"]>>;
	exit: Mock<(code: number) => void>;
}

const createStartDeps = (overrides: Partial<StartDeps> = {}): StartMocks => {
	const app = createAppMock();
	const middleware: RequestHandler = (_req, _res, next): void => {
		next();
	};
	const i18n = vi.fn<() => Promise<RequestHandler>>(async () => middleware);
	const router = vi.fn<() => ReturnType<StartDeps["router"]>>(
		() => middleware as unknown as ReturnType<StartDeps["router"]>,
	);
	const exit = vi.fn<(code: number) => void>();
	return {
		app,
		i18n,
		router,
		exit,
		deps: {
			createApp: (): Express => app.app,
			i18n,
			router,
			logger: getLogger("fatal", "provider-mock:test"),
			port: DEFAULT_API_PORT,
			exit,
			...overrides,
		},
	};
};

const saved: Record<string, string | undefined> = {};

const setEnv = (name: string, value: string | undefined): void => {
	if (!(name in saved)) {
		saved[name] = process.env[name];
	}
	if (value === undefined) {
		Reflect.deleteProperty(process.env, name);
	} else {
		process.env[name] = value;
	}
};

afterEach(() => {
	for (const [name, value] of Object.entries(saved)) {
		if (value === undefined) {
			Reflect.deleteProperty(process.env, name);
		} else {
			process.env[name] = value;
		}
	}
	vi.restoreAllMocks();
});

describe("readPort", () => {
	test("defaults when nothing is set", () => {
		expect(readPort({})).toBe(DEFAULT_API_PORT);
	});

	test("uses the configured port", () => {
		expect(readPort({ PROVIDER_MOCK_PORT: "3000" })).toBe(3000);
	});

	test("port 0 means let the OS choose, and is honoured", () => {
		expect(readPort({ PROVIDER_MOCK_PORT: "0" })).toBe(0);
	});

	test("the highest port is allowed", () => {
		expect(readPort({ PROVIDER_MOCK_PORT: "65535" })).toBe(65535);
	});

	const rejected: string[] = [
		"",
		"   ",
		"http",
		"80.5",
		"-1",
		"65536",
		"NaN",
		"Infinity",
	];

	for (const value of rejected) {
		test(`falls back to the default for ${JSON.stringify(value)}`, () => {
			// A value listen() cannot use would either throw at startup or bind
			// somewhere unexpected; the default is the safer answer.
			expect(readPort({ PROVIDER_MOCK_PORT: value })).toBe(DEFAULT_API_PORT);
		});
	}
});

describe("startApi", () => {
	let mocks: StartMocks;

	beforeEach(() => {
		mocks = createStartDeps();
	});

	test("listens on the configured port", async () => {
		mocks = createStartDeps({ port: 4321 });
		await startApi(mocks.deps);
		expect(mocks.app.listen).toHaveBeenCalledWith(4321);
	});

	test("mounts cors, the body parser, i18n, the router and the error handler", async () => {
		await startApi(mocks.deps);
		expect(mocks.app.use).toHaveBeenCalledTimes(5);
	});

	test("mounts the error handler last, or it would catch nothing", async () => {
		await startApi(mocks.deps);
		const handlers = mocks.app.use.mock.calls.map((call) => call[0]);
		expect(handlers).toHaveLength(5);
		expect(handlers.at(-1)).toBeInstanceOf(Function);
	});

	test("mounts i18n before the router, so req.t exists in the handlers", async () => {
		await startApi(mocks.deps);
		const middleware = await mocks.i18n.mock.results[0]?.value;
		const handlers = mocks.app.use.mock.calls.map((call) => call[0]);
		expect(handlers.indexOf(middleware)).toBeLessThan(handlers.length - 1);
		expect(mocks.i18n).toHaveBeenCalledOnce();
		expect(mocks.router).toHaveBeenCalledOnce();
	});

	test("returns the app, so a caller can shut it down", async () => {
		expect(await startApi(mocks.deps)).toBe(mocks.app.app);
	});

	test("a failure to load translations stops startup", async () => {
		mocks.i18n.mockRejectedValue(new Error("no locales"));
		await expect(startApi(mocks.deps)).rejects.toThrow("no locales");
		expect(mocks.app.listen).not.toHaveBeenCalled();
	});

	test("a router that cannot be built stops startup", async () => {
		mocks.router.mockImplementation(() => {
			throw new Error("bad mongo url");
		});
		await expect(startApi(mocks.deps)).rejects.toThrow("bad mongo url");
		expect(mocks.app.listen).not.toHaveBeenCalled();
	});

	test("a port already in use is propagated", async () => {
		// The bind failure arrives on the server's error event well after listen()
		// has returned, so startApi has to wait for it rather than resolve first.
		mocks.app.failWith(new Error("EADDRINUSE"));
		await expect(startApi(mocks.deps)).rejects.toThrow("EADDRINUSE");
	});

	test("does not resolve before the socket is listening", async () => {
		// Resolving early would let a caller — or a container healthcheck — treat
		// the mock as up while nothing is bound yet.
		let listening = false;
		mocks.app.listen.mockImplementation(() => {
			const server = new EventEmitter();
			setImmediate(() => {
				listening = true;
				server.emit("listening");
			});
			return server as unknown as Server;
		});
		await startApi(mocks.deps);
		expect(listening).toBe(true);
	});
});

describe("main", () => {
	test("starts the api and does not exit", async () => {
		const mocks = createStartDeps();
		await main(mocks.deps);
		expect(mocks.app.listen).toHaveBeenCalledOnce();
		expect(mocks.exit).not.toHaveBeenCalled();
	});

	test("exits non-zero when startup fails", async () => {
		// Resolving quietly would leave a container marked healthy with nothing
		// listening in it.
		const mocks = createStartDeps();
		mocks.i18n.mockRejectedValue(new Error("no locales"));
		await main(mocks.deps);
		expect(mocks.exit).toHaveBeenCalledWith(1);
	});

	test("does not reject, so the exit code is the one it chose", async () => {
		const mocks = createStartDeps();
		mocks.i18n.mockRejectedValue(new Error("no locales"));
		await expect(main(mocks.deps)).resolves.toBeUndefined();
	});

	test("survives a thrown non-Error", async () => {
		const mocks = createStartDeps();
		mocks.i18n.mockRejectedValue("no locales");
		await main(mocks.deps);
		expect(mocks.exit).toHaveBeenCalledWith(1);
	});
});

describe("defaultStartDeps", () => {
	test("takes the port from the environment", () => {
		setEnv("PROVIDER_MOCK_PORT", "5555");
		expect(defaultStartDeps().port).toBe(5555);
	});

	test("defaults the port when the environment says nothing", () => {
		setEnv("PROVIDER_MOCK_PORT", undefined);
		expect(defaultStartDeps().port).toBe(DEFAULT_API_PORT);
	});

	test("supplies every dependency startApi needs", () => {
		const deps: StartDeps = defaultStartDeps();
		expect(typeof deps.createApp).toBe("function");
		expect(typeof deps.i18n).toBe("function");
		expect(deps.router).toBeInstanceOf(Function);
		expect(typeof deps.exit).toBe("function");
	});
});
