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

import type { DetectorResult } from "@prosopo/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as decodePayloadModule from "../../../../tasks/detection/decodePayload.js";
import {
	getBotScore,
	sanitiseSignalMap,
} from "../../../../tasks/detection/getBotScore.js";

vi.mock("../../../../tasks/detection/decodePayload.js", () => ({
	default: vi.fn(),
}));

describe("getBotScore", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns bot score with all fields when decodePayload succeeds", async () => {
		const mockResult: DetectorResult = {
			score: 0.85,
			timestamp: 1234567890,
			userId: "user123",
			userAgent: "Mozilla/5.0",
			isWebView: false,
			isIframe: true,
			decryptedHeadHash: "hash123",
		};

		vi.mocked(decodePayloadModule.default).mockResolvedValue(mockResult);

		const result = await getBotScore("payload", "headHash", "privateKey");

		expect(result).toEqual({
			baseBotScore: 0.85,
			timestamp: 1234567890,
			userId: "user123",
			userAgent: "Mozilla/5.0",
			isWebView: false,
			isIframe: true,
			decryptedHeadHash: "hash123",
		});
		expect(decodePayloadModule.default).toHaveBeenCalledWith(
			"payload",
			"headHash",
			"privateKey",
			undefined,
		);
	});

	it("returns default values when baseBotScore is undefined", async () => {
		const mockResult: DetectorResult = {
			score: undefined,
			timestamp: 1234567890,
		} as unknown as DetectorResult;

		vi.mocked(decodePayloadModule.default).mockResolvedValue(mockResult);

		const result = await getBotScore("payload", "headHash");

		expect(result).toEqual({
			baseBotScore: 1,
			timestamp: 0,
		});
	});

	it("handles missing optional fields", async () => {
		const mockResult: DetectorResult = {
			score: 0.5,
			timestamp: 1234567890,
		} as unknown as DetectorResult;

		vi.mocked(decodePayloadModule.default).mockResolvedValue(mockResult);

		const result = await getBotScore("payload", "headHash");

		expect(result).toEqual({
			baseBotScore: 0.5,
			timestamp: 1234567890,
			userId: undefined,
			userAgent: undefined,
			isWebView: false,
			isIframe: false,
			decryptedHeadHash: undefined,
		});
	});

	it("passes g through", async () => {
		const mockResult: DetectorResult = {
			score: 0.5,
			timestamp: 1234567890,
			g: "Google Inc. (NVIDIA)~ANGLE (NVIDIA, NVIDIA GeForce RTX 3080)",
		} as unknown as DetectorResult;

		vi.mocked(decodePayloadModule.default).mockResolvedValue(mockResult);

		const result = await getBotScore("payload", "headHash");

		expect(result.g).toBe(
			"Google Inc. (NVIDIA)~ANGLE (NVIDIA, NVIDIA GeForce RTX 3080)",
		);
	});

	it("leaves g undefined when the client predates the field", async () => {
		const mockResult: DetectorResult = {
			score: 0.5,
			timestamp: 1234567890,
		} as unknown as DetectorResult;

		vi.mocked(decodePayloadModule.default).mockResolvedValue(mockResult);

		const result = await getBotScore("payload", "headHash");

		expect(result.g).toBeUndefined();
	});

	it("passes i through", async () => {
		const mockResult: DetectorResult = {
			score: 0.5,
			timestamp: 1234567890,
			i: true,
		} as unknown as DetectorResult;

		vi.mocked(decodePayloadModule.default).mockResolvedValue(mockResult);

		const result = await getBotScore("payload", "headHash");

		expect(result.i).toBe(true);
	});

	it("preserves a false i rather than dropping it", async () => {
		const mockResult: DetectorResult = {
			score: 0.5,
			timestamp: 1234567890,
			i: false,
		} as unknown as DetectorResult;

		vi.mocked(decodePayloadModule.default).mockResolvedValue(mockResult);

		const result = await getBotScore("payload", "headHash");

		expect(result.i).toBe(false);
	});

	it("leaves i undefined when the client predates the field", async () => {
		const mockResult: DetectorResult = {
			score: 0.5,
			timestamp: 1234567890,
		} as unknown as DetectorResult;

		vi.mocked(decodePayloadModule.default).mockResolvedValue(mockResult);

		const result = await getBotScore("payload", "headHash");

		expect(result.i).toBeUndefined();
	});

	it("handles isWebView as undefined", async () => {
		const mockResult: DetectorResult = {
			score: 0.5,
			timestamp: 1234567890,
			isWebView: undefined,
		} as unknown as DetectorResult;

		vi.mocked(decodePayloadModule.default).mockResolvedValue(mockResult);

		const result = await getBotScore("payload", "headHash");

		expect(result.isWebView).toBe(false);
	});

	it("handles isIframe as undefined", async () => {
		const mockResult: DetectorResult = {
			score: 0.5,
			timestamp: 1234567890,
			isIframe: undefined,
		} as unknown as DetectorResult;

		vi.mocked(decodePayloadModule.default).mockResolvedValue(mockResult);

		const result = await getBotScore("payload", "headHash");

		expect(result.isIframe).toBe(false);
	});

	it("calls decodePayload with correct parameters", async () => {
		const mockResult: DetectorResult = {
			score: 0.5,
			timestamp: 1234567890,
		} as unknown as DetectorResult;

		vi.mocked(decodePayloadModule.default).mockResolvedValue(mockResult);

		await getBotScore("testPayload", "testHeadHash", "testPrivateKey");

		expect(decodePayloadModule.default).toHaveBeenCalledWith(
			"testPayload",
			"testHeadHash",
			"testPrivateKey",
			undefined,
		);
	});

	it("calls decodePayload without privateKey when not provided", async () => {
		const mockResult = {
			score: 0.5,
			timestamp: 1234567890,
			userId: "",
			userAgent: "",
			decryptedHeadHash: "",
		} as DetectorResult;

		vi.mocked(decodePayloadModule.default).mockResolvedValue(mockResult);

		await getBotScore("testPayload", "testHeadHash");

		expect(decodePayloadModule.default).toHaveBeenCalledWith(
			"testPayload",
			"testHeadHash",
			undefined,
			undefined,
		);
	});
});

describe("sanitiseSignalMap", () => {
	// `b` is opaque client-controlled data that now lands on the session
	// record, so it has to survive the Mongo write rather than 400 the
	// request. See the bounds in getBotScore.ts.
	it("passes a well-formed signal map through unchanged", () => {
		const map: Record<string, string[]> = { k1: ["v1", "v2"], k2: [] };
		expect(sanitiseSignalMap(map)).toEqual(map);
	});

	it("returns undefined for anything that isn't a plain object", () => {
		expect(sanitiseSignalMap(undefined)).toBeUndefined();
		expect(sanitiseSignalMap(null)).toBeUndefined();
		expect(sanitiseSignalMap("nope")).toBeUndefined();
		expect(sanitiseSignalMap(["nope"])).toBeUndefined();
	});

	it("drops keys Mongo cannot store as field names", () => {
		expect(
			sanitiseSignalMap({
				ok: ["v"],
				"has.dot": ["v"],
				$op: ["v"],
				"": ["v"],
			}),
		).toEqual({ ok: ["v"] });
	});

	it("drops entries whose value isn't an array of short strings", () => {
		expect(
			sanitiseSignalMap({
				ok: ["v"],
				notArray: "v",
				notStrings: [1, 2],
				tooLong: ["x".repeat(257)],
			}),
		).toEqual({ ok: ["v"] });
	});

	it("caps key count and per-key value count", () => {
		const oversized: Record<string, string[]> = {};
		for (let index = 0; index < 100; index++) {
			oversized[`k${index}`] = Array.from({ length: 100 }, () => "v");
		}

		const sanitised = sanitiseSignalMap(oversized);

		expect(Object.keys(sanitised ?? {})).toHaveLength(64);
		for (const values of Object.values(sanitised ?? {})) {
			expect(values).toHaveLength(64);
		}
	});

	it("returns undefined when nothing survives", () => {
		expect(sanitiseSignalMap({ "bad.key": ["v"] })).toBeUndefined();
		expect(sanitiseSignalMap({})).toBeUndefined();
	});
});
