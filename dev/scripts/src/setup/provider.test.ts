import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the entire @prosopo/provider module
vi.mock("@prosopo/provider", () => ({
	Tasks: vi.fn(),
}));

// Mock @prosopo/datasets
vi.mock("@prosopo/datasets", () => ({
	datasetWithSolutionHashes: [],
}));

import { setupProvider } from "./provider.js";

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
		expect(mockTasks.datasetManager.providerSetDataset).toHaveBeenCalled();
		expect(mockEnv.logger.info).toHaveBeenCalledWith(expect.any(Function));
	});
});
