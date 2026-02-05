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
import { ApiRemoveDetectorKeyEndpoint } from "../../../../api/admin/apiRemoveDetectorKeyEndpoint.js";

describe("ApiRemoveDetectorKeyEndpoint", () => {
	let endpoint: ApiRemoveDetectorKeyEndpoint;
	let mockClientTaskManager: {
		removeDetectorKey: ReturnType<typeof vi.fn>;
	};
	let mockLogger: {
		info: ReturnType<typeof vi.fn>;
		error: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockClientTaskManager = {
			removeDetectorKey: vi.fn().mockResolvedValue(undefined),
		};
		mockLogger = {
			info: vi.fn(),
			error: vi.fn(),
		};
		endpoint = new ApiRemoveDetectorKeyEndpoint(mockClientTaskManager as never);
	});

	it("returns success status when detector key is removed", async () => {
		const result = await endpoint.processRequest(
			{
				detectorKey: "test-key",
				expirationInSeconds: 3600,
			},
			mockLogger as never,
		);

		expect(result.status).toBe(ApiEndpointResponseStatus.SUCCESS);
	});

	it("calls removeDetectorKey with correct parameters", async () => {
		const detectorKey = "test-key";
		const expirationInSeconds = 3600;

		await endpoint.processRequest(
			{ detectorKey, expirationInSeconds },
			mockLogger as never,
		);

		expect(mockClientTaskManager.removeDetectorKey).toHaveBeenCalledWith(
			detectorKey,
			expirationInSeconds,
		);
	});

	it("returns fail status when removeDetectorKey throws error", async () => {
		const error = new Error("Test error");
		mockClientTaskManager.removeDetectorKey.mockRejectedValue(error);

		const result = await endpoint.processRequest(
			{
				detectorKey: "test-key",
				expirationInSeconds: 3600,
			},
			mockLogger as never,
		);

		expect(result.status).toBe(ApiEndpointResponseStatus.FAIL);
		expect(result.error).toBe("Test error");
	});

	it("logs error when removeDetectorKey fails", async () => {
		const error = new Error("Test error");
		mockClientTaskManager.removeDetectorKey.mockRejectedValue(error);

		await endpoint.processRequest(
			{
				detectorKey: "test-key",
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
