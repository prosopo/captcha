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
import { ServerApiVersion } from "mongodb";
import { describe, expect, it } from "vitest";
import {
	type MongoCompressor,
	getMongoCompressors,
	getMongoConnectionOptions,
} from "../mongooseOptions.js";

const DEFAULT_COMPRESSORS: MongoCompressor[] = [
	"zstd",
	"snappy",
	"zlib",
	"none",
];

describe("getMongoCompressors", () => {
	it("returns default compressors for remote domains", () => {
		const urls = [
			"mongodb://user:pass@example.com:27017/db",
			"mongodb://abc.com/db",
			"mongodb://x.y.com:27017/db",
			"mongodb://cluster.mongodb.net/db",
			"mongodb://subdomain.example.com/db",
		];
		for (const url of urls) {
			expect(getMongoCompressors(url)).toEqual(DEFAULT_COMPRESSORS);
		}
	});

	it("returns empty array for local hostnames without dots", () => {
		const urls = [
			"mongodb://database:27017/db",
			"mongodb://db/db",
			"mongodb://mongo:27017/db",
			"mongodb://container-name/db",
		];
		for (const url of urls) {
			expect(getMongoCompressors(url)).toEqual([]);
		}
	});

	it("returns empty array for localhost variants", () => {
		const urls = [
			"mongodb://localhost:27017/db",
			"mongodb://127.0.0.1:27017/db",
			"mongodb://[::1]:27017/db",
		];
		for (const url of urls) {
			expect(getMongoCompressors(url)).toEqual([]);
		}
	});

	it("returns compressors for IP addresses (treated as remote)", () => {
		const urls = [
			"mongodb://192.168.1.1:27017/db",
			"mongodb://10.0.0.1/db",
			"mongodb://172.16.0.1:27017/db",
		];
		for (const url of urls) {
			expect(getMongoCompressors(url)).toEqual(DEFAULT_COMPRESSORS);
		}
	});

	it("returns compressors for IPv6 addresses (treated as remote)", () => {
		const urls = [
			"mongodb://[2001:0db8::1]:27017/db",
			"mongodb://[2001:0db8:85a3::8a2e:0370:7334]/db",
			"mongodb://[::ffff:192.168.1.1]:27017/db",
		];
		for (const url of urls) {
			expect(getMongoCompressors(url)).toEqual(DEFAULT_COMPRESSORS);
		}
	});

	it("uses custom compressors when provided", () => {
		const customCompressors: MongoCompressor[] = ["zstd", "snappy"];
		const url = "mongodb://example.com:27017/db";
		expect(getMongoCompressors(url, customCompressors)).toEqual(
			customCompressors,
		);
	});

	it("returns empty array for local connections even with custom compressors", () => {
		const customCompressors: MongoCompressor[] = ["zstd", "snappy"];
		const url = "mongodb://localhost:27017/db";
		expect(getMongoCompressors(url, customCompressors)).toEqual([]);
	});

	it("handles mongodb+srv:// URLs", () => {
		const url = "mongodb+srv://cluster.mongodb.net/db";
		expect(getMongoCompressors(url)).toEqual(DEFAULT_COMPRESSORS);
	});

	it("returns default compressors when the host cannot be parsed", () => {
		// Bare (unbracketed) IPv6 with a port is not a valid URL host, so URL
		// parsing throws and we fall back to compression.
		const unparseableUrls = ["mongodb://::1:27017/db", "mongodb://[bad"];
		for (const url of unparseableUrls) {
			expect(getMongoCompressors(url)).toEqual(DEFAULT_COMPRESSORS);
		}
	});

	it("returns empty array for hostless URLs and bare single-label hosts", () => {
		// "" and "mongodb://" have no host; "not-a-url" parses to a single-label
		// host, which (like a container name) is treated as local.
		const urls = ["", "mongodb://", "not-a-url"];
		for (const url of urls) {
			expect(getMongoCompressors(url)).toEqual([]);
		}
	});

	it("handles URLs with authentication", () => {
		const url = "mongodb://user:password@example.com:27017/db";
		expect(getMongoCompressors(url)).toEqual(DEFAULT_COMPRESSORS);
	});

	it("handles URLs with query parameters", () => {
		const url =
			"mongodb://example.com:27017/db?authSource=admin&retryWrites=true";
		expect(getMongoCompressors(url)).toEqual(DEFAULT_COMPRESSORS);
	});
});

describe("getMongoConnectionOptions", () => {
	const appName = "test-app";

	it("throws on an empty or whitespace-only URL", () => {
		expect(() => getMongoConnectionOptions({ url: "", appName })).toThrow(
			/cannot be empty/,
		);
		expect(() => getMongoConnectionOptions({ url: "   ", appName })).toThrow(
			/cannot be empty/,
		);
	});

	it("applies sensible defaults", () => {
		const options = getMongoConnectionOptions({
			url: "mongodb://example.com:27017/db",
			appName,
		});
		expect(options.appName).toBe(appName);
		expect(options.maxPoolSize).toBe(10);
		expect(options.minPoolSize).toBe(0);
		expect(options.serverApi).toEqual({
			version: ServerApiVersion.v1,
			strict: false,
			deprecationErrors: false,
		});
	});

	it("uses no compressors for localhost", () => {
		const options = getMongoConnectionOptions({
			url: "mongodb://localhost:27017/db",
			appName,
		});
		expect(options.compressors).toEqual([]);
	});

	it("uses default compressors for a remote host", () => {
		const options = getMongoConnectionOptions({
			url: "mongodb://cluster.mongodb.net/db",
			appName,
		});
		expect(options.compressors).toEqual(DEFAULT_COMPRESSORS);
	});

	it("applies pool size overrides", () => {
		const options = getMongoConnectionOptions({
			url: "mongodb://example.com:27017/db",
			appName,
			maxPoolSize: 50,
			minPoolSize: 5,
		});
		expect(options.maxPoolSize).toBe(50);
		expect(options.minPoolSize).toBe(5);
	});

	it("only sets dbName when provided", () => {
		const withDbName = getMongoConnectionOptions({
			url: "mongodb://example.com:27017/db",
			appName,
			dbName: "mydb",
		});
		expect(withDbName.dbName).toBe("mydb");

		const withoutDbName = getMongoConnectionOptions({
			url: "mongodb://example.com:27017/db",
			appName,
		});
		expect(withoutDbName.dbName).toBeUndefined();
	});
});
