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

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GeolocationService } from "../../../services/geolocation.js";

// Mock the @maxmind/geoip2-node module
vi.mock("@maxmind/geoip2-node", () => ({
	Reader: {
		open: vi.fn(),
	},
}));

describe("GeolocationService", () => {
	let mockReader: {
		country: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockReader = {
			country: vi.fn(),
		};
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("constructor", () => {
		it("should create a service without database path", () => {
			const service = new GeolocationService();
			expect(service).toBeInstanceOf(GeolocationService);
			expect(service.isAvailable()).toBe(false);
		});

		it("should create a service with database path", () => {
			const service = new GeolocationService("/path/to/db.mmdb");
			expect(service).toBeInstanceOf(GeolocationService);
		});
	});

	describe("initialize", () => {
		it("should return early if no database path is configured", async () => {
			const { Reader } = await import("@maxmind/geoip2-node");
			const service = new GeolocationService();

			await service.initialize();

			expect(Reader.open).not.toHaveBeenCalled();
			expect(service.isAvailable()).toBe(false);
		});

		it("should initialize the reader with the database path", async () => {
			const { Reader } = await import("@maxmind/geoip2-node");
			vi.mocked(Reader.open).mockResolvedValueOnce(mockReader as never);

			const service = new GeolocationService("/path/to/db.mmdb");
			await service.initialize();

			expect(Reader.open).toHaveBeenCalledWith("/path/to/db.mmdb");
			expect(service.isAvailable()).toBe(true);
		});

		it("should handle initialization errors gracefully", async () => {
			const { Reader } = await import("@maxmind/geoip2-node");
			vi.mocked(Reader.open).mockRejectedValueOnce(new Error("File not found"));

			const service = new GeolocationService("/path/to/nonexistent.mmdb");
			await service.initialize();

			expect(service.isAvailable()).toBe(false);
		});

		it("should only initialize once", async () => {
			const { Reader } = await import("@maxmind/geoip2-node");
			vi.mocked(Reader.open).mockResolvedValue(mockReader as never);

			const service = new GeolocationService("/path/to/db.mmdb");
			await Promise.all([
				service.initialize(),
				service.initialize(),
				service.initialize(),
			]);

			expect(Reader.open).toHaveBeenCalledTimes(1);
		});
	});

	describe("getCountryCode", () => {
		it("should return undefined if no database path is configured", async () => {
			const service = new GeolocationService();

			const result = await service.getCountryCode("8.8.8.8");

			expect(result).toBeUndefined();
		});

		it("should return country code for valid IP", async () => {
			const { Reader } = await import("@maxmind/geoip2-node");
			mockReader.country.mockReturnValueOnce({
				country: { isoCode: "US" },
			});
			vi.mocked(Reader.open).mockResolvedValueOnce(mockReader as never);

			const service = new GeolocationService("/path/to/db.mmdb");
			const result = await service.getCountryCode("8.8.8.8");

			expect(result).toBe("US");
			expect(mockReader.country).toHaveBeenCalledWith("8.8.8.8");
		});

		it("should return undefined for invalid IP", async () => {
			const { Reader } = await import("@maxmind/geoip2-node");
			mockReader.country.mockImplementationOnce(() => {
				throw new Error("Invalid IP address");
			});
			vi.mocked(Reader.open).mockResolvedValueOnce(mockReader as never);

			const service = new GeolocationService("/path/to/db.mmdb");
			const result = await service.getCountryCode("invalid-ip");

			expect(result).toBeUndefined();
		});

		it("should return undefined if country data is not available", async () => {
			const { Reader } = await import("@maxmind/geoip2-node");
			mockReader.country.mockReturnValueOnce({
				country: null,
			});
			vi.mocked(Reader.open).mockResolvedValueOnce(mockReader as never);

			const service = new GeolocationService("/path/to/db.mmdb");
			const result = await service.getCountryCode("192.168.1.1");

			expect(result).toBeUndefined();
		});

		it("should lazy-initialize on first lookup", async () => {
			const { Reader } = await import("@maxmind/geoip2-node");
			mockReader.country.mockReturnValueOnce({
				country: { isoCode: "GB" },
			});
			vi.mocked(Reader.open).mockResolvedValueOnce(mockReader as never);

			const service = new GeolocationService("/path/to/db.mmdb");
			// Don't call initialize explicitly
			const result = await service.getCountryCode("1.2.3.4");

			expect(Reader.open).toHaveBeenCalledWith("/path/to/db.mmdb");
			expect(result).toBe("GB");
		});
	});

	describe("isAvailable", () => {
		it("should return false before initialization", () => {
			const service = new GeolocationService("/path/to/db.mmdb");
			expect(service.isAvailable()).toBe(false);
		});

		it("should return true after successful initialization", async () => {
			const { Reader } = await import("@maxmind/geoip2-node");
			vi.mocked(Reader.open).mockResolvedValueOnce(mockReader as never);

			const service = new GeolocationService("/path/to/db.mmdb");
			await service.initialize();

			expect(service.isAvailable()).toBe(true);
		});

		it("should return false after failed initialization", async () => {
			const { Reader } = await import("@maxmind/geoip2-node");
			vi.mocked(Reader.open).mockRejectedValueOnce(new Error("Failed"));

			const service = new GeolocationService("/path/to/db.mmdb");
			await service.initialize();

			expect(service.isAvailable()).toBe(false);
		});
	});
});
