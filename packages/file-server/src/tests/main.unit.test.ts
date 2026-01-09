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

	it("should resize image when resize is configured", async () => {
		// Testing image resizing functionality which is hard to test in integration
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

});