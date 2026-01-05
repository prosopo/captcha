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

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import addDataAttr from "./index.js";

describe("addDataAttr", () => {
	const originalEnv = process.env.NODE_ENV;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		process.env.NODE_ENV = originalEnv;
	});

	it("should convert general data to data attributes", () => {
		const result = addDataAttr({
			general: { test: "value", another: "test2" },
		});
		expect(result).toEqual({
			"data-test": "value",
			"data-another": "test2",
		});
	});

	it("should convert dev data to data attributes in non-production mode", () => {
		process.env.NODE_ENV = "development";
		const result = addDataAttr({
			dev: { cy: "test-element", debug: "true" },
		});
		expect(result).toEqual({
			"data-cy": "test-element",
			"data-debug": "true",
		});
	});

	it("should not include dev data attributes in production mode", () => {
		process.env.NODE_ENV = "production";
		const result = addDataAttr({
			dev: { cy: "test-element", debug: "true" },
		});
		expect(result).toEqual({});
	});

	it("should combine general and dev attributes in non-production mode", () => {
		process.env.NODE_ENV = "test";
		const result = addDataAttr({
			general: { id: "element-1" },
			dev: { cy: "test-element" },
		});
		expect(result).toEqual({
			"data-id": "element-1",
			"data-cy": "test-element",
		});
	});

	it("should only include general attributes in production mode when both are provided", () => {
		process.env.NODE_ENV = "production";
		const result = addDataAttr({
			general: { id: "element-1" },
			dev: { cy: "test-element" },
		});
		expect(result).toEqual({
			"data-id": "element-1",
		});
	});

	it("should handle empty objects", () => {
		const result = addDataAttr({});
		expect(result).toEqual({});
	});

	it("should handle undefined general and dev", () => {
		const result = addDataAttr({
			general: undefined,
			dev: undefined,
		});
		expect(result).toEqual({});
	});

	it("should handle empty general and dev objects", () => {
		const result = addDataAttr({
			general: {},
			dev: {},
		});
		expect(result).toEqual({});
	});

	it("should handle special characters in values", () => {
		const result = addDataAttr({
			general: {
				"test-key": "value with spaces",
				another: "value-with-dashes",
			},
		});
		expect(result).toEqual({
			"data-test-key": "value with spaces",
			"data-another": "value-with-dashes",
		});
	});

	it("should handle numeric values by converting them to strings", () => {
		const result = addDataAttr({
			general: { count: "123", index: "0" },
		});
		expect(result).toEqual({
			"data-count": "123",
			"data-index": "0",
		});
	});
});
