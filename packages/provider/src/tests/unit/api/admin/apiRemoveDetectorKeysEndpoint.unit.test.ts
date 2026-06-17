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

import { ApiEndpointResponseStatus } from "@prosopo/api-route";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiRemoveDetectorKeysEndpoint } from "../../../../api/admin/apiRemoveDetectorKeysEndpoint.js";

describe("ApiRemoveDetectorKeysEndpoint", () => {
	let endpoint: ApiRemoveDetectorKeysEndpoint;
	let mockClientTaskManager: {
		removeDetectorKeys: ReturnType<typeof vi.fn>;
	};
	let mockLogger: {
		info: ReturnType<typeof vi.fn>;
		error: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockClientTaskManager = {
			removeDetectorKeys: vi.fn().mockResolvedValue(undefined),
		};
		mockLogger = {
			info: vi.fn(),
			error: vi.fn(),
		};
		endpoint = new ApiRemoveDetectorKeysEndpoint(
			mockClientTaskManager as never,
		);
	});

	it("returns success status when detector keys are removed", async () => {
		const result = await endpoint.processRequest(
			{
				detectorKeys: ["key-1", "key-2"],
				expirationInSeconds: 3600,
			},
			mockLogger as never,
		);

		expect(result.status).toBe(ApiEndpointResponseStatus.SUCCESS);
	});

	it("calls removeDetectorKeys with correct parameters", async () => {
		const detectorKeys = ["key-1", "key-2", "key-3"];
		const expirationInSeconds = 3600;

		await endpoint.processRequest(
			{ detectorKeys, expirationInSeconds },
			mockLogger as never,
		);

		expect(mockClientTaskManager.removeDetectorKeys).toHaveBeenCalledWith(
			detectorKeys,
			expirationInSeconds,
		);
	});

	it("returns fail status when removeDetectorKeys throws error", async () => {
		const error = new Error("Test error");
		mockClientTaskManager.removeDetectorKeys.mockRejectedValue(error);

		const result = await endpoint.processRequest(
			{
				detectorKeys: ["key-1"],
				expirationInSeconds: 3600,
			},
			mockLogger as never,
		);

		expect(result.status).toBe(ApiEndpointResponseStatus.FAIL);
		expect(result.error).toBe("Test error");
	});

	it("logs error when removeDetectorKeys fails", async () => {
		const error = new Error("Test error");
		mockClientTaskManager.removeDetectorKeys.mockRejectedValue(error);

		await endpoint.processRequest(
			{
				detectorKeys: ["key-1"],
				expirationInSeconds: 3600,
			},
			mockLogger as never,
		);

		expect(mockLogger.error).toHaveBeenCalled();
	});

	it("returns correct schema", () => {
		const schema = endpoint.getRequestArgsSchema();
		expect(schema).toBeDefined();
	});
});
