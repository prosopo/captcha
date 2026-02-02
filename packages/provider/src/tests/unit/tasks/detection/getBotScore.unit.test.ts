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
import { getBotScore } from "../../../../tasks/detection/getBotScore.js";

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
			providerSelectEntropy: 12345,
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
			providerSelectEntropy: 12345,
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
		);
	});

	it("returns default values when baseBotScore is undefined", async () => {
		const mockResult: DetectorResult = {
			score: undefined,
			timestamp: 1234567890,
			providerSelectEntropy: 12345,
		} as unknown as DetectorResult;

		vi.mocked(decodePayloadModule.default).mockResolvedValue(mockResult);

		const result = await getBotScore("payload", "headHash");

		expect(result).toEqual({
			baseBotScore: 1,
			timestamp: 0,
			providerSelectEntropy: 13837,
		});
	});

	it("handles missing optional fields", async () => {
		const mockResult: DetectorResult = {
			score: 0.5,
			timestamp: 1234567890,
			providerSelectEntropy: 12345,
		} as unknown as DetectorResult;

		vi.mocked(decodePayloadModule.default).mockResolvedValue(mockResult);

		const result = await getBotScore("payload", "headHash");

		expect(result).toEqual({
			baseBotScore: 0.5,
			timestamp: 1234567890,
			providerSelectEntropy: 12345,
			userId: undefined,
			userAgent: undefined,
			isWebView: false,
			isIframe: false,
			decryptedHeadHash: undefined,
		});
	});

	it("handles isWebView as undefined", async () => {
		const mockResult: DetectorResult = {
			score: 0.5,
			timestamp: 1234567890,
			providerSelectEntropy: 12345,
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
			providerSelectEntropy: 12345,
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
			providerSelectEntropy: 12345,
		} as unknown as DetectorResult;

		vi.mocked(decodePayloadModule.default).mockResolvedValue(mockResult);

		await getBotScore("testPayload", "testHeadHash", "testPrivateKey");

		expect(decodePayloadModule.default).toHaveBeenCalledWith(
			"testPayload",
			"testHeadHash",
			"testPrivateKey",
		);
	});

	it("calls decodePayload without privateKey when not provided", async () => {
		const mockResult = {
			score: 0.5,
			timestamp: 1234567890,
			providerSelectEntropy: 12345,
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
		);
	});
});
