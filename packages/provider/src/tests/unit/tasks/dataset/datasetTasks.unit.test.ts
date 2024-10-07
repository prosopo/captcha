// Copyright 2021-2024 Prosopo (UK) Ltd.
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

import type { Logger } from "@prosopo/common";
import { parseCaptchaDataset } from "@prosopo/datasets";
import type {
	CaptchaConfig,
	DatasetRaw,
	ProsopoConfigOutput,
	ScheduledTaskNames,
	ScheduledTaskResult,
	ScheduledTaskStatus,
} from "@prosopo/types";
import {
	type IProviderDatabase,
	type ScheduledTaskRecord,
	ScheduledTaskSchema,
} from "@prosopo/types-database";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DatasetManager } from "../../../../tasks/dataset/datasetTasks.js";

// Import directly and mock the function
import * as datasetTasksUtils from "../../../../tasks/dataset/datasetTasksUtils.js";

vi.mock("@prosopo/database", () => ({
	saveCaptchaEvent: vi.fn(),
	saveCaptchas: vi.fn(),
}));

vi.mock("@prosopo/datasets", () => ({
	parseCaptchaDataset: vi.fn(),
}));

vi.spyOn(datasetTasksUtils, "providerValidateDataset");

type TestScheduledTaskRecord = Pick<
	ScheduledTaskRecord,
	"updated" | "_id" | "status" | "processName"
>;

describe("DatasetManager", () => {
	let config: ProsopoConfigOutput;
	let logger: Logger;
	let captchaConfig: CaptchaConfig;
	let providerDB: IProviderDatabase;
	let datasetManager: DatasetManager;
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const collections: Record<string, any> = {};

	beforeEach(() => {
		config = {
			devOnlyWatchEvents: true,
			mongoEventsUri: "mongodb://localhost:27017/events",
			mongoCaptchaUri: "mongodb://localhost:27017/captchas",
		} as ProsopoConfigOutput;

		logger = {
			info: vi.fn().mockImplementation(console.info),
			debug: vi.fn().mockImplementation(console.debug),
			error: vi.fn().mockImplementation(console.error),
		} as unknown as Logger;

		captchaConfig = {
			solved: { count: 5 },
			unsolved: { count: 5 },
		} as CaptchaConfig;

		collections.schedulers = {} as {
			records: Record<string, TestScheduledTaskRecord>;
			nextID: number;
			time: number;
		};
		collections.schedulers.records = {} as {
			number: TestScheduledTaskRecord;
		};
		collections.schedulers.nextID = 0;
		collections.schedulers.time = 0;

		providerDB = {
			storeDataset: vi.fn(),
			getUnstoredDappUserCommitments: vi.fn().mockResolvedValue([]),
			markDappUserCommitmentsStored: vi.fn(),
			markDappUserPoWCommitmentsStored: vi.fn(),
			getUnstoredDappUserPoWCommitments: vi.fn().mockResolvedValue([]),
			createScheduledTaskStatus: vi.fn(
				(taskName: ScheduledTaskNames, status: ScheduledTaskStatus) => {
					const _id = collections.schedulers.nextID;
					collections.schedulers.records[_id] = ScheduledTaskSchema.parse({
						_id,
						processName: taskName,
						status,
						datetime: collections.schedulers.time,
					});
					collections.schedulers.nextID += 1;
					collections.schedulers.time += 1;
					return _id;
				},
			),
			updateScheduledTaskStatus: vi.fn(
				(
					// biome-ignore lint/suspicious/noExplicitAny: <explanation>
					taskID: any,
					status: ScheduledTaskStatus,
					result?: ScheduledTaskResult,
				) => {
					const task = collections.schedulers.records[taskID];
					task.status = status;
					task.result = result;
					task.updated = collections.schedulers.time;
					collections.schedulers.time += 1;
				},
			),
			getLastScheduledTaskStatus: vi.fn(
				// biome-ignore lint/suspicious/noExplicitAny: <explanation>
				(taskID: any, status: ScheduledTaskStatus) => {
					return (
						Object.keys(collections.schedulers.records)
							// biome-ignore lint/suspicious/noExplicitAny: <explanation>
							.map((key: any) => collections.schedulers.records[key])
							.find(
								(task: ScheduledTaskRecord) =>
									task.processName === taskID && task.status === status,
							)
					);
				},
			),
		} as unknown as IProviderDatabase;

		datasetManager = new DatasetManager(
			config,
			logger,
			captchaConfig,
			providerDB,
		);
		vi.clearAllMocks();
	});

	it("should set the provider dataset from a file", async () => {
		const mockFile = { captchas: [] };
		const mockDatasetRaw = { captchas: [], format: "SelectAll" } as DatasetRaw;
		const mockValidatedDataset = { datasetId: "123", datasetContentId: "456" };
		// biome-ignore lint/suspicious/noExplicitAny: TODO fix
		(parseCaptchaDataset as any).mockReturnValue(mockDatasetRaw);
		// biome-ignore lint/suspicious/noExplicitAny: TODO fix
		(datasetTasksUtils.providerValidateDataset as any).mockResolvedValue(
			mockValidatedDataset,
		);

		await datasetManager.providerSetDatasetFromFile(
			mockFile as unknown as JSON,
		);

		expect(parseCaptchaDataset).toHaveBeenCalledWith(mockFile);
		expect(datasetTasksUtils.providerValidateDataset).toHaveBeenCalledWith(
			mockDatasetRaw,
			captchaConfig.solved.count,
			captchaConfig.unsolved.count,
		);
		expect(providerDB.storeDataset).toHaveBeenCalledWith(mockValidatedDataset);
	});
});
