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

import type { DetectorData, DetectorResult } from "@prosopo/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as decoderPool from "../../../../tasks/detection/decoderPool.js";
import {
	getBotScore,
	sanitiseDetectorData,
} from "../../../../tasks/detection/getBotScore.js";

vi.mock("../../../../tasks/detection/decoderPool.js", () => ({
	decode: vi.fn(),
}));

describe("getBotScore", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns bot score with all fields when the decoder succeeds", async () => {
		const mockResult: DetectorResult = {
			score: 0.85,
			timestamp: 1234567890,
			userId: "user123",
			userAgent: "Mozilla/5.0",
			isWebView: false,
			isIframe: true,
			decryptedHeadHash: "hash123",
		};

		vi.mocked(decoderPool.decode).mockResolvedValue(mockResult);

		const result = await getBotScore("payload", "headHash", "privateKey");

		expect(result).toEqual({
			baseBotScore: 0.85,
			timestamp: 1234567890,
			userId: "user123",
			userAgent: "Mozilla/5.0",
			isWebView: false,
			isIframe: true,
			decryptedHeadHash: "hash123",
			triggeredDetectors: undefined,
			shadowDomPenalty: undefined,
			d: undefined,
		});
		expect(decoderPool.decode).toHaveBeenCalledWith("payload", [
			"payload",
			"headHash",
			"privateKey",
			undefined,
			undefined,
			undefined,
		]);
	});

	it("returns default values when baseBotScore is undefined", async () => {
		const mockResult: DetectorResult = {
			score: undefined,
			timestamp: 1234567890,
		} as unknown as DetectorResult;

		vi.mocked(decoderPool.decode).mockResolvedValue(mockResult);

		const result = await getBotScore("payload", "headHash");

		expect(result).toEqual({
			baseBotScore: 1,
			timestamp: 0,
			isWebView: false,
			isIframe: false,
			decryptedHeadHash: "",
		});
	});

	it("handles missing optional fields", async () => {
		const mockResult: DetectorResult = {
			score: 0.5,
			timestamp: 1234567890,
		} as unknown as DetectorResult;

		vi.mocked(decoderPool.decode).mockResolvedValue(mockResult);

		const result = await getBotScore("payload", "headHash");

		expect(result).toEqual({
			baseBotScore: 0.5,
			timestamp: 1234567890,
			userId: undefined,
			userAgent: undefined,
			isWebView: false,
			isIframe: false,
			decryptedHeadHash: undefined,
			triggeredDetectors: undefined,
			shadowDomPenalty: undefined,
			d: undefined,
		});
	});

	// The whole point of the bag: a key nothing in this repo declares reaches
	// the caller intact, so a rule can read it without a provider release.
	it("passes through keys the provider has no knowledge of", async () => {
		const mockResult: DetectorResult = {
			score: 0.5,
			timestamp: 1234567890,
			d: {
				aKeyThisRepoDoesNotKnow: "yes",
				nested: { k1: 3, k2: [true, false] },
			},
		} as unknown as DetectorResult;

		vi.mocked(decoderPool.decode).mockResolvedValue(mockResult);

		const result = await getBotScore("payload", "headHash");

		expect(result.d).toEqual({
			aKeyThisRepoDoesNotKnow: "yes",
			nested: { k1: 3, k2: [true, false] },
		});
	});

	it("leaves the bag undefined when the detector reported nothing", async () => {
		const mockResult: DetectorResult = {
			score: 0.5,
			timestamp: 1234567890,
			d: {},
		} as unknown as DetectorResult;

		vi.mocked(decoderPool.decode).mockResolvedValue(mockResult);

		const result = await getBotScore("payload", "headHash");

		expect(result.d).toBeUndefined();
	});

	it("sanitises the bag before returning it", async () => {
		const mockResult: DetectorResult = {
			score: 0.5,
			timestamp: 1234567890,
			d: { ok: 1, "has.dot": 2 },
		} as unknown as DetectorResult;

		vi.mocked(decoderPool.decode).mockResolvedValue(mockResult);

		const result = await getBotScore("payload", "headHash");

		expect(result.d).toEqual({ ok: 1 });
	});

	it("handles isWebView as undefined", async () => {
		const mockResult: DetectorResult = {
			score: 0.5,
			timestamp: 1234567890,
			isWebView: undefined,
		} as unknown as DetectorResult;

		vi.mocked(decoderPool.decode).mockResolvedValue(mockResult);

		const result = await getBotScore("payload", "headHash");

		expect(result.isWebView).toBe(false);
	});

	it("handles isIframe as undefined", async () => {
		const mockResult: DetectorResult = {
			score: 0.5,
			timestamp: 1234567890,
			isIframe: undefined,
		} as unknown as DetectorResult;

		vi.mocked(decoderPool.decode).mockResolvedValue(mockResult);

		const result = await getBotScore("payload", "headHash");

		expect(result.isIframe).toBe(false);
	});

	it("forwards the per-bundle decode parameters to the decoder", async () => {
		const mockResult: DetectorResult = {
			score: 0.5,
			timestamp: 1234567890,
		} as unknown as DetectorResult;

		vi.mocked(decoderPool.decode).mockResolvedValue(mockResult);

		await getBotScore(
			"testPayload",
			"testHeadHash",
			"testPrivateKey",
			"innerConfig",
			"layout",
			"keyMap",
		);

		expect(decoderPool.decode).toHaveBeenCalledWith("payload", [
			"testPayload",
			"testHeadHash",
			"testPrivateKey",
			"innerConfig",
			"layout",
			"keyMap",
		]);
	});

	it("calls the decoder without privateKey when not provided", async () => {
		const mockResult = {
			score: 0.5,
			timestamp: 1234567890,
			userId: "",
			userAgent: "",
			decryptedHeadHash: "",
		} as DetectorResult;

		vi.mocked(decoderPool.decode).mockResolvedValue(mockResult);

		await getBotScore("testPayload", "testHeadHash");

		expect(decoderPool.decode).toHaveBeenCalledWith("payload", [
			"testPayload",
			"testHeadHash",
			undefined,
			undefined,
			undefined,
			undefined,
		]);
	});
});

describe("sanitiseDetectorData", () => {
	// The bag is unbounded client-controlled data that lands on the session
	// record, so it has to survive the Mongo write rather than 400 the
	// request. See the bounds in getBotScore.ts.
	it("passes a well-formed bag through unchanged", () => {
		const bag: DetectorData = {
			str: "v",
			num: 1,
			bool: true,
			nul: null,
			arr: ["a", 2],
			obj: { nested: { deeper: "ok" } },
		};
		expect(sanitiseDetectorData(bag)).toEqual(bag);
	});

	it("returns undefined for anything that isn't a plain object", () => {
		expect(sanitiseDetectorData(undefined)).toBeUndefined();
		expect(sanitiseDetectorData(null)).toBeUndefined();
		expect(sanitiseDetectorData("nope")).toBeUndefined();
		expect(sanitiseDetectorData(["nope"])).toBeUndefined();
	});

	it("drops keys Mongo cannot store as field names, at any depth", () => {
		expect(
			sanitiseDetectorData({
				ok: "v",
				"has.dot": "v",
				$op: "v",
				"": "v",
				nested: { fine: 1, "also.bad": 2 },
			}),
		).toEqual({ ok: "v", nested: { fine: 1 } });
	});

	it("drops values that cannot be represented as JSON", () => {
		expect(
			sanitiseDetectorData({
				ok: 1,
				nan: Number.NaN,
				infinite: Number.POSITIVE_INFINITY,
				fn: () => undefined,
				undef: undefined,
			}),
		).toEqual({ ok: 1 });
	});

	it("truncates overlong strings rather than dropping the key", () => {
		const sanitised = sanitiseDetectorData({ long: "x".repeat(600) });
		expect(sanitised?.long).toBe("x".repeat(512));
	});

	// The caps are layered rather than simultaneously reachable: a bag at both
	// the key and array ceilings would exceed the serialised-size ceiling and
	// be dropped whole. Each is exercised on its own.
	it("caps key count", () => {
		const oversized: Record<string, unknown> = {};
		for (let index = 0; index < 100; index++) {
			oversized[`k${index}`] = index;
		}

		expect(Object.keys(sanitiseDetectorData(oversized) ?? {})).toHaveLength(64);
	});

	it("caps array length", () => {
		const sanitised = sanitiseDetectorData({
			arr: Array.from({ length: 100 }, () => "v"),
		});

		expect(sanitised?.arr).toHaveLength(64);
	});

	it("keeps values at their own types rather than stringifying them", () => {
		const sanitised = sanitiseDetectorData({
			bool: false,
			num: 0,
			arr: [1, true, "s"],
		});

		expect(sanitised?.bool).toBe(false);
		expect(sanitised?.num).toBe(0);
		expect(sanitised?.arr).toEqual([1, true, "s"]);
	});

	it("drops containers nested past the depth cap", () => {
		expect(
			sanitiseDetectorData({
				a: { b: { c: { d: { e: "too deep" } } } },
			}),
		).toEqual({ a: { b: { c: {} } } });
	});

	it("keeps a scalar sitting at the depth cap", () => {
		expect(
			sanitiseDetectorData({
				a: { b: { c: { d: "deep but scalar" } } },
			}),
		).toEqual({ a: { b: { c: { d: "deep but scalar" } } } });
	});

	it("drops a bag that is still oversized once the caps are applied", () => {
		const wide: Record<string, unknown> = {};
		for (let index = 0; index < 64; index++) {
			wide[`k${index}`] = "x".repeat(512);
		}
		expect(sanitiseDetectorData(wide)).toBeUndefined();
	});

	it("returns undefined when nothing survives", () => {
		expect(sanitiseDetectorData({ "bad.key": "v" })).toBeUndefined();
		expect(sanitiseDetectorData({})).toBeUndefined();
	});
});
