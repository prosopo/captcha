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

import { describe, expect, it, vi, beforeEach } from "vitest";
import { setupProvider } from "./provider.js";
import { Tasks } from "@prosopo/provider";
import { datasetWithSolutionHashes } from "@prosopo/datasets";

vi.mock("@prosopo/provider");
vi.mock("@prosopo/datasets");

describe("setupProvider", () => {
	const mockEnv = {
		logger: {
			info: vi.fn(),
			debug: vi.fn(),
			error: vi.fn(),
			warn: vi.fn(),
		},
	} as any;

	const mockTasks = {
		datasetManager: {
			providerSetDataset: vi.fn().mockResolvedValue(undefined),
		},
	};

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(Tasks).mockImplementation(() => mockTasks as any);
	});

	it("should call providerSetDataset with datasetWithSolutionHashes", async () => {
		await setupProvider(mockEnv);

		expect(Tasks).toHaveBeenCalledWith(mockEnv);
		expect(mockTasks.datasetManager.providerSetDataset).toHaveBeenCalledWith(
			datasetWithSolutionHashes,
		);
		expect(mockEnv.logger.info).toHaveBeenCalledWith(
			expect.any(Function),
		);
	});
});

