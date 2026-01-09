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

import { ProsopoEnvError } from "@prosopo/common";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { downloadImage } from "../captcha/util.js";

describe("UTIL FUNCTIONS", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	test("downloadImage successfully downloads image data", async () => {
		const mockData = new Uint8Array([1, 2, 3, 4, 5]);
		const mockResponse = {
			ok: true,
			arrayBuffer: vi.fn().mockResolvedValue(mockData.buffer),
		};

		global.fetch = vi.fn().mockResolvedValue(mockResponse);

		const result = await downloadImage("https://example.com/image.jpg");

		expect(global.fetch).toHaveBeenCalledWith("https://example.com/image.jpg");
		expect(result).toBeInstanceOf(Uint8Array);
		expect(result).toEqual(mockData);
	});

	test("downloadImage throws ProsopoEnvError when response is not ok", async () => {
		const mockResponse = {
			ok: false,
			status: 404,
		};

		global.fetch = vi.fn().mockResolvedValue(mockResponse);

		await expect(
			downloadImage("https://example.com/image.jpg"),
		).rejects.toThrow(ProsopoEnvError);
	});

	test("downloadImage throws ProsopoEnvError when fetch fails", async () => {
		const mockError = new Error("Network error");
		global.fetch = vi.fn().mockRejectedValue(mockError);

		await expect(
			downloadImage("https://example.com/image.jpg"),
		).rejects.toThrow(ProsopoEnvError);
	});

	test("downloadImage handles empty response", async () => {
		const mockData = new Uint8Array([]);
		const mockResponse = {
			ok: true,
			arrayBuffer: vi.fn().mockResolvedValue(mockData.buffer),
		};

		global.fetch = vi.fn().mockResolvedValue(mockResponse);

		const result = await downloadImage("https://example.com/empty.jpg");

		expect(result).toBeInstanceOf(Uint8Array);
		expect(result.length).to.equal(0);
	});

	test("downloadImage handles large image data", async () => {
		const largeData = new Uint8Array(1024 * 1024).fill(255);
		const mockResponse = {
			ok: true,
			arrayBuffer: vi.fn().mockResolvedValue(largeData.buffer),
		};

		global.fetch = vi.fn().mockResolvedValue(mockResponse);

		const result = await downloadImage("https://example.com/large.jpg");

		expect(result).toBeInstanceOf(Uint8Array);
		expect(result.length).to.equal(1024 * 1024);
	});
});
