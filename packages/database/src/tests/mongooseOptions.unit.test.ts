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
import { describe, expect, it } from "vitest";
import { getMongoCompressors } from "../mongooseOptions.js";

describe("getMongoCompressors", () => {
    it("returns default compressors for remote domains", () => {
        const urls = [
            "mongodb://user:pass@example.com:27017/db",
            "mongodb://abc.com/db",
            "mongodb://x.y.com:27017/db",
            "mongodb://cluster.mongodb.net/db",
            "mongodb://subdomain.example.com/db",
        ];
        const expected = ["zstd", "snappy", "zlib", "none"];
        urls.forEach((url) => {
            expect(getMongoCompressors(url)).toEqual(expected);
        });
    });

	it("returns empty array for local hostnames without dots", () => {
		const urls = [
			"mongodb://database:27017/db",
			"mongodb://db/db",
			"mongodb://mongo:27017/db",
			"mongodb://container-name/db",
		];
		urls.forEach((url) => {
			expect(getMongoCompressors(url)).toEqual([]);
		});
	});

	it("returns empty array for localhost variants", () => {
		const urls = [
			"mongodb://localhost:27017/db",
			"mongodb://127.0.0.1:27017/db",
			"mongodb://[::1]:27017/db",
			"mongodb://::1:27017/db",
		];
		urls.forEach((url) => {
			expect(getMongoCompressors(url)).toEqual([]);
		});
	});

	it("returns compressors for IP addresses (treated as remote)", () => {
		const urls = [
			"mongodb://192.168.1.1:27017/db",
			"mongodb://10.0.0.1/db",
			"mongodb://172.16.0.1:27017/db",
		];
		const expected = ["zstd", "snappy", "zlib", "none"];
		urls.forEach((url) => {
			expect(getMongoCompressors(url)).toEqual(expected);
		});
	});

	it("returns compressors for IPv6 addresses (treated as remote)", () => {
		const urls = [
			"mongodb://[2001:0db8::1]:27017/db",
			"mongodb://[2001:0db8:85a3::8a2e:0370:7334]/db",
			"mongodb://[::ffff:192.168.1.1]:27017/db",
		];
		const expected = ["zstd", "snappy", "zlib", "none"];
		urls.forEach((url) => {
			expect(getMongoCompressors(url)).toEqual(expected);
		});
	});

    it("uses custom compressors when provided", () => {
        const customCompressors = ["zstd", "snappy"];
        const url = "mongodb://example.com:27017/db";
        expect(getMongoCompressors(url, customCompressors)).toEqual(
            customCompressors,
        );
    });

    it("returns empty array for local connections even with custom compressors", () => {
        const customCompressors = ["zstd", "snappy"];
        const url = "mongodb://localhost:27017/db";
        expect(getMongoCompressors(url, customCompressors)).toEqual([]);
    });

    it("handles mongodb+srv:// URLs", () => {
        const url = "mongodb+srv://cluster.mongodb.net/db";
        const expected = ["zstd", "snappy", "zlib", "none"];
        expect(getMongoCompressors(url)).toEqual(expected);
    });

    it("returns default compressors for invalid URLs", () => {
        const invalidUrls = [
            "not-a-url",
            "",
            "mongodb://",
            "invalid://example.com",
        ];
        const expected = ["zstd", "snappy", "zlib", "none"];
        invalidUrls.forEach((url) => {
            expect(getMongoCompressors(url)).toEqual(expected);
        });
    });

    it("handles URLs with authentication", () => {
        const url = "mongodb://user:password@example.com:27017/db";
        const expected = ["zstd", "snappy", "zlib", "none"];
        expect(getMongoCompressors(url)).toEqual(expected);
    });

    it("handles URLs with query parameters", () => {
        const url =
            "mongodb://example.com:27017/db?authSource=admin&retryWrites=true";
        const expected = ["zstd", "snappy", "zlib", "none"];
        expect(getMongoCompressors(url)).toEqual(expected);
    });
});

