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
import { ApiUpdateDetectorKeyEndpoint } from "../../../../api/admin/apiUpdateDetectorKeyEndpoint.js";

describe("ApiUpdateDetectorKeyEndpoint", () => {
	let endpoint: ApiUpdateDetectorKeyEndpoint;
	let mockClientTaskManager: {
		updateDetectorKey: ReturnType<typeof vi.fn>;
	};
	let mockLogger: {
		info: ReturnType<typeof vi.fn>;
		error: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockClientTaskManager = {
			updateDetectorKey: vi.fn().mockResolvedValue(["key1", "key2"]),
		};
		mockLogger = {
			info: vi.fn(),
			error: vi.fn(),
		};
		endpoint = new ApiUpdateDetectorKeyEndpoint(mockClientTaskManager as never);
	});

	it("returns success status with active detector keys", async () => {
		const result = await endpoint.processRequest(
			{
				detectorKey: "test-key",
			},
			mockLogger as never,
		);

		expect(result.status).toBe(ApiEndpointResponseStatus.SUCCESS);
		expect(result.data).toHaveProperty("activeDetectorKeys", ["key1", "key2"]);
	});

	it("calls updateDetectorKey with correct parameters", async () => {
		const detectorKey = "test-key";

		await endpoint.processRequest({ detectorKey }, mockLogger as never);

		expect(mockClientTaskManager.updateDetectorKey).toHaveBeenCalledWith(
			detectorKey,
		);
	});

	it("returns fail status when updateDetectorKey throws error", async () => {
		const error = new Error("Test error");
		mockClientTaskManager.updateDetectorKey.mockRejectedValue(error);

		const result = await endpoint.processRequest(
			{
				detectorKey: "test-key",
			},
			mockLogger as never,
		);

		expect(result.status).toBe(ApiEndpointResponseStatus.FAIL);
		expect(result.error).toBe("Test error");
	});

	it("logs error when updateDetectorKey fails", async () => {
		const error = new Error("Test error");
		mockClientTaskManager.updateDetectorKey.mockRejectedValue(error);

		await endpoint.processRequest(
			{
				detectorKey: "test-key",
			},
			mockLogger as never,
		);

		expect(mockLogger.error).toHaveBeenCalled();
	});

	it("logs success message with active detector keys", async () => {
		await endpoint.processRequest(
			{
				detectorKey: "test-key",
			},
			mockLogger as never,
		);

		expect(mockLogger.info).toHaveBeenCalled();
	});

	it("returns correct schema", () => {
		const schema = endpoint.getRequestArgsSchema();
		expect(schema).toBeDefined();
	});
});
