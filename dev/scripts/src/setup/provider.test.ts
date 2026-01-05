import { Tasks } from "@prosopo/provider";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { setupProvider } from "./provider.js";

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
		expect(mockTasks.datasetManager.providerSetDataset).toHaveBeenCalled();
		expect(mockEnv.logger.info).toHaveBeenCalledWith(expect.any(Function));
	});
});
