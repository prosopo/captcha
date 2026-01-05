import stream from "node:stream";
import express from "express";
import sharp from "sharp";
// Copyright 2021-2025 Prosopo (UK) Ltd.
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
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	expectTypeOf,
	it,
	vi,
} from "vitest";
import { main } from "../index.js";

vi.mock("express", () => {
	const mockApp = {
		use: vi.fn(),
		get: vi.fn(),
		listen: vi.fn((port, callback) => {
			if (callback) callback();
			return {
				close: vi.fn(),
			};
		}),
	};
	const mockExpress = vi.fn(() => mockApp);
	mockExpress.static = vi.fn(() => vi.fn());
	return {
		default: mockExpress,
	};
});

vi.mock("sharp", () => {
	const mockSharp = vi.fn(() => ({
		resize: vi.fn().mockReturnThis(),
		toBuffer: vi.fn().mockResolvedValue(Buffer.from("resized-image")),
	}));
	return {
		default: mockSharp,
	};
});

vi.mock("node:stream", () => {
	const mockReadable = {
		from: vi.fn((data) => ({
			pipe: vi.fn(),
		})),
	};
	return {
		default: {
			Readable: mockReadable,
		},
	};
});

global.fetch = vi.fn();

describe("main", () => {
	const originalEnv = process.env;
	const originalConsoleInfo = console.info;
	const originalConsoleWarn = console.warn;

	beforeEach(() => {
		vi.clearAllMocks();
		process.env = { ...originalEnv };
		console.info = vi.fn();
		console.warn = vi.fn();
	});

	afterEach(() => {
		process.env = originalEnv;
		console.info = originalConsoleInfo;
		console.warn = originalConsoleWarn;
	});

	it("should set up express app with static file serving for paths", async () => {
		process.env.PROSOPO_FILE_SERVER_PATHS = '["/path1", "/path2"]';
		process.env.PROSOPO_FILE_SERVER_PORT = "3000";
		process.env.PROSOPO_FILE_SERVER_REMOTES = "[]";
		process.env.PROSOPO_FILE_SERVER_RESIZE = undefined;
		process.env.PROSOPO_LOG_LEVEL = undefined;
		process.env.NODE_ENV = undefined;

		const mockApp = express();
		await main();

		expect(mockApp.use).toHaveBeenCalledWith("/", expect.any(Function));
		expect(mockApp.use).toHaveBeenCalledTimes(2);
		expect(mockApp.listen).toHaveBeenCalledWith("3000", expect.any(Function));
	});

	it("should set up catch-all route for remote requests", async () => {
		process.env.PROSOPO_FILE_SERVER_PATHS = "[]";
		process.env.PROSOPO_FILE_SERVER_PORT = "3000";
		process.env.PROSOPO_FILE_SERVER_REMOTES = '["http://remote1"]';
		process.env.PROSOPO_FILE_SERVER_RESIZE = undefined;
		process.env.PROSOPO_LOG_LEVEL = undefined;
		process.env.NODE_ENV = undefined;

		const mockApp = express();
		await main();

		expect(mockApp.get).toHaveBeenCalledWith("*", expect.any(Function));
	});

	it("should handle successful remote fetch without resize", async () => {
		process.env.PROSOPO_FILE_SERVER_PATHS = "[]";
		process.env.PROSOPO_FILE_SERVER_PORT = "3000";
		process.env.PROSOPO_FILE_SERVER_REMOTES = '["http://remote1"]';
		process.env.PROSOPO_FILE_SERVER_RESIZE = undefined;
		process.env.PROSOPO_LOG_LEVEL = undefined;
		process.env.NODE_ENV = undefined;

		const mockResponse = {
			status: 200,
			arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
		};
		vi.mocked(global.fetch).mockResolvedValue(mockResponse as Response);

		const mockApp = express();
		const mockRes = {
			status: vi.fn().mockReturnThis(),
			send: vi.fn(),
			pipe: vi.fn(),
		};
		const mockReq = {
			url: "/test.jpg",
		};

		await main();

		const getHandler = vi.mocked(mockApp.get).mock.calls[0]?.[1];
		if (getHandler) {
			// biome-ignore lint/suspicious/noExplicitAny: Test mocks
			await getHandler(mockReq as any, mockRes as any);
		}

		expect(global.fetch).toHaveBeenCalledWith("http://remote1/test.jpg");
		expect(mockResponse.arrayBuffer).toHaveBeenCalled();
		expect(stream.Readable.from).toHaveBeenCalled();
		expect(sharp).not.toHaveBeenCalled();
	});

	it("should resize image when resize is configured", async () => {
		process.env.PROSOPO_FILE_SERVER_PATHS = "[]";
		process.env.PROSOPO_FILE_SERVER_PORT = "3000";
		process.env.PROSOPO_FILE_SERVER_REMOTES = '["http://remote1"]';
		process.env.PROSOPO_FILE_SERVER_RESIZE = "128";
		process.env.PROSOPO_LOG_LEVEL = undefined;
		process.env.NODE_ENV = undefined;

		const mockResponse = {
			status: 200,
			arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
		};
		vi.mocked(global.fetch).mockResolvedValue(mockResponse as Response);

		const mockApp = express();
		const mockRes = {
			status: vi.fn().mockReturnThis(),
			send: vi.fn(),
			pipe: vi.fn(),
		};
		const mockReq = {
			url: "/test.jpg",
		};

		await main();

		const getHandler = vi.mocked(mockApp.get).mock.calls[0]?.[1];
		if (getHandler) {
			// biome-ignore lint/suspicious/noExplicitAny: Test mocks
			await getHandler(mockReq as any, mockRes as any);
		}

		expect(sharp).toHaveBeenCalled();
		const sharpInstance = vi.mocked(sharp).mock.results[0]?.value;
		expect(sharpInstance?.resize).toHaveBeenCalledWith({
			width: 128,
			height: 128,
			fit: "fill",
		});
		expect(sharpInstance?.toBuffer).toHaveBeenCalled();
	});

	it("should try next remote when fetch returns non-200 status", async () => {
		process.env.PROSOPO_FILE_SERVER_PATHS = "[]";
		process.env.PROSOPO_FILE_SERVER_PORT = "3000";
		process.env.PROSOPO_FILE_SERVER_REMOTES =
			'["http://remote1", "http://remote2"]';
		process.env.PROSOPO_FILE_SERVER_RESIZE = undefined;
		process.env.PROSOPO_LOG_LEVEL = undefined;
		process.env.NODE_ENV = undefined;

		const mockResponse1 = {
			status: 404,
			arrayBuffer: vi.fn(),
		};
		const mockResponse2 = {
			status: 200,
			arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
		};
		vi.mocked(global.fetch)
			.mockResolvedValueOnce(mockResponse1 as Response)
			.mockResolvedValueOnce(mockResponse2 as Response);

		const mockApp = express();
		const mockRes = {
			status: vi.fn().mockReturnThis(),
			send: vi.fn(),
			pipe: vi.fn(),
		};
		const mockReq = {
			url: "/test.jpg",
		};

		await main();

		const getHandler = vi.mocked(mockApp.get).mock.calls[0]?.[1];
		if (getHandler) {
			// biome-ignore lint/suspicious/noExplicitAny: Test mocks
			await getHandler(mockReq as any, mockRes as any);
		}

		expect(global.fetch).toHaveBeenCalledWith("http://remote1/test.jpg");
		expect(global.fetch).toHaveBeenCalledWith("http://remote2/test.jpg");
		expect(mockResponse1.arrayBuffer).not.toHaveBeenCalled();
		expect(mockResponse2.arrayBuffer).toHaveBeenCalled();
	});

	it("should try next remote when fetch throws error", async () => {
		process.env.PROSOPO_FILE_SERVER_PATHS = "[]";
		process.env.PROSOPO_FILE_SERVER_PORT = "3000";
		process.env.PROSOPO_FILE_SERVER_REMOTES =
			'["http://remote1", "http://remote2"]';
		process.env.PROSOPO_FILE_SERVER_RESIZE = undefined;
		process.env.PROSOPO_LOG_LEVEL = undefined;
		process.env.NODE_ENV = undefined;

		vi.mocked(global.fetch)
			.mockRejectedValueOnce(new Error("Network error"))
			.mockResolvedValueOnce({
				status: 200,
				arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
			} as Response);

		const mockApp = express();
		const mockRes = {
			status: vi.fn().mockReturnThis(),
			send: vi.fn(),
			pipe: vi.fn(),
		};
		const mockReq = {
			url: "/test.jpg",
		};

		await main();

		const getHandler = vi.mocked(mockApp.get).mock.calls[0]?.[1];
		if (getHandler) {
			// biome-ignore lint/suspicious/noExplicitAny: Test mocks
			await getHandler(mockReq as any, mockRes as any);
		}

		expect(global.fetch).toHaveBeenCalledWith("http://remote1/test.jpg");
		expect(global.fetch).toHaveBeenCalledWith("http://remote2/test.jpg");
	});

	it("should return 404 when no remote finds the file", async () => {
		process.env.PROSOPO_FILE_SERVER_PATHS = "[]";
		process.env.PROSOPO_FILE_SERVER_PORT = "3000";
		process.env.PROSOPO_FILE_SERVER_REMOTES = '["http://remote1"]';
		process.env.PROSOPO_FILE_SERVER_RESIZE = undefined;
		process.env.PROSOPO_LOG_LEVEL = undefined;
		process.env.NODE_ENV = undefined;

		const mockResponse = {
			status: 404,
			arrayBuffer: vi.fn(),
		};
		vi.mocked(global.fetch).mockResolvedValue(mockResponse as Response);

		const mockApp = express();
		const mockRes = {
			status: vi.fn().mockReturnThis(),
			send: vi.fn(),
			pipe: vi.fn(),
		};
		const mockReq = {
			url: "/test.jpg",
		};

		await main();

		const getHandler = vi.mocked(mockApp.get).mock.calls[0]?.[1];
		if (getHandler) {
			// biome-ignore lint/suspicious/noExplicitAny: Test mocks
			await getHandler(mockReq as any, mockRes as any);
		}

		expect(mockRes.status).toHaveBeenCalledWith(404);
		expect(mockRes.send).toHaveBeenCalledWith("Not found");
	});

	it("should have correct return type", () => {
		expectTypeOf(main).returns.resolves.toEqualTypeOf<void>();
	});
});
