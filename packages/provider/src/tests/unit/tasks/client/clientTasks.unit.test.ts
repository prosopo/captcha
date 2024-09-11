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
import {
	type ProsopoConfigOutput,
	ScheduledTaskNames,
	type ScheduledTaskResult,
	ScheduledTaskStatus,
} from "@prosopo/types";
import {
	type IProviderDatabase,
	type PoWCaptchaStored,
	type ScheduledTaskRecord,
	ScheduledTaskSchema,
	type UserCommitment,
} from "@prosopo/types-database";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClientTaskManager } from "../../../../tasks/client/clientTasks.js";

type TestScheduledTaskRecord = Pick<
	ScheduledTaskRecord,
	"updated" | "_id" | "status" | "processName"
>;

vi.mock("@prosopo/database", async (importOriginal) => {
	const actual = (await importOriginal()) as Record<string, any>;

	const mockLogger = {
		info: vi.fn().mockImplementation(console.info),
		debug: vi.fn().mockImplementation(console.debug),
		error: vi.fn().mockImplementation(console.error),
	};

	class MockCaptchaDatabase {
		logger: any;

		constructor() {
			this.logger = mockLogger;
		}

		connect() {
			return vi.fn();
		}

		saveCaptchas() {
			return vi.fn(() => {
				console.log("mock of savecaptchas");
			});
		}
	}

	return {
		...actual,
		CaptchaDatabase: MockCaptchaDatabase,
	};
});

describe("ClientTaskManager", () => {
	let config: ProsopoConfigOutput;
	let logger: Logger;
	let providerDB: IProviderDatabase;
	let clientTaskManager: ClientTaskManager;
	const collections: Record<string, any> = {};

	beforeEach(() => {
		const mockLogger = {
			info: vi.fn().mockImplementation(console.info),
			debug: vi.fn().mockImplementation(console.debug),
			error: vi.fn().mockImplementation(console.error),
		};

		config = {
			devOnlyWatchEvents: true,
			mongoEventsUri: "mongodb://localhost:27017/events",
			mongoCaptchaUri: "mongodb://localhost:27017/captchas",
		} as ProsopoConfigOutput;

		logger = mockLogger as unknown as Logger;

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
				(taskID: any, status: ScheduledTaskStatus) => {
					return Object.keys(collections.schedulers.records)
						.map((key: any) => collections.schedulers.records[key])
						.find(
							(task: ScheduledTaskRecord) =>
								task.processName === taskID && task.status === status,
						);
				},
			),
		} as unknown as IProviderDatabase;

		// captchaDB = {
		//   saveCaptchas: vi.fn(() => {
		//     console.log("hey im a mock of savecaptchas");
		//   }),
		//   logger: mockLogger,
		//   super: {
		//     connect: vi.fn(async (resolve) => resolve()),
		//   },
		// } as unknown as ICaptchaDatabase;

		clientTaskManager = new ClientTaskManager(config, logger, providerDB);
		vi.clearAllMocks();
	});
	it("should not store commitments externally if mongoCaptchaUri is not set", async () => {
		config.mongoCaptchaUri = undefined;

		await clientTaskManager.storeCommitmentsExternal();

		expect(logger.info).toHaveBeenCalledWith("Mongo env not set");
		expect(providerDB.getUnstoredDappUserCommitments).not.toHaveBeenCalled();
	});

	it("should store commitments externally if mongoCaptchaUri is set", async () => {
		const mockCommitments: Pick<UserCommitment, "id">[] = [
			{ id: "commitment1" },
		];
		const mockPoWCommitments: Pick<PoWCaptchaStored, "challenge">[] = [
			{
				challenge: "1234567___userAccount___dappAccount",
			},
		];

		// biome-ignore lint/suspicious/noExplicitAny: TODO fix
		(providerDB.getUnstoredDappUserCommitments as any).mockResolvedValue(
			mockCommitments,
		);

		// biome-ignore lint/suspicious/noExplicitAny: TODO fix
		(providerDB.createScheduledTaskStatus as any).mockResolvedValue({});

		// biome-ignore lint/suspicious/noExplicitAny: TODO fix
		(providerDB.updateScheduledTaskStatus as any).mockResolvedValue({});

		// biome-ignore lint/suspicious/noExplicitAny: TODO fix
		(providerDB.getUnstoredDappUserPoWCommitments as any).mockResolvedValue(
			mockPoWCommitments,
		);

		await clientTaskManager.storeCommitmentsExternal();

		expect(providerDB.getUnstoredDappUserCommitments).toHaveBeenCalled();
		expect(providerDB.getUnstoredDappUserPoWCommitments).toHaveBeenCalled();

		expect(providerDB.markDappUserCommitmentsStored).toHaveBeenCalledWith(
			mockCommitments.map((c) => c.id),
		);
		expect(providerDB.markDappUserPoWCommitmentsStored).toHaveBeenCalledWith(
			mockPoWCommitments.map((c) => c.challenge),
		);
	});

	it("should not store commitments externally if they have been stored", async () => {
		const mockCommitments: Pick<
			UserCommitment,
			"id" | "lastUpdatedTimestamp"
		>[] = [
			{
				id: "commitment1",
				// Image commitments were stored at time 1
				lastUpdatedTimestamp: 1,
			},
		];

		const mockPoWCommitments: Pick<
			PoWCaptchaStored,
			"challenge" | "lastUpdatedTimestamp"
		>[] = [
			{
				challenge: "1234567___userAccount___dappAccount",
				// PoW commitments were stored at time 3
				lastUpdatedTimestamp: 3,
			},
		];

		// Create a mock last scheduled task
		const mockLastScheduledTask: Pick<
			ScheduledTaskRecord,
			"updated" | "_id" | "status" | "processName"
		> = {
			_id: 0,
			status: ScheduledTaskStatus.Completed,
			processName: ScheduledTaskNames.StoreCommitmentsExternal,
			// Last task ran at time 1
			updated: 1,
		};

		// Put the mock last scheduled task in the collection
		collections.schedulers.records[0] = mockLastScheduledTask;

		// Update the next ID and time (time is used as a timestamp)
		collections.schedulers.nextID += 1;
		collections.schedulers.time = 2;

		// biome-ignore lint/suspicious/noExplicitAny: TODO fix
		(providerDB.getUnstoredDappUserCommitments as any).mockResolvedValue(
			mockCommitments,
		);

		// biome-ignore lint/suspicious/noExplicitAny: TODO fix
		(providerDB.getUnstoredDappUserPoWCommitments as any).mockResolvedValue(
			mockPoWCommitments,
		);

		await clientTaskManager.storeCommitmentsExternal();

		expect(providerDB.getUnstoredDappUserCommitments).toHaveBeenCalled();
		expect(providerDB.getUnstoredDappUserPoWCommitments).toHaveBeenCalled();

		expect(providerDB.getLastScheduledTaskStatus).toHaveReturnedWith(
			mockLastScheduledTask,
		);

		expect(providerDB.createScheduledTaskStatus).toHaveBeenCalledWith(
			ScheduledTaskNames.StoreCommitmentsExternal,
			ScheduledTaskStatus.Running,
		);
		// TODO either pass in this DB to the function or use mockingoose to mock mongoose
		// expect(captchaDB.saveCaptchas).toHaveBeenCalledWith(
		//   // Image commitments should not be stored as their updated timestamp is less than the last task `updated` timestamp
		//   [],
		//   // PoW commitments should be stored as they are more recent than the last task `updated` timestamp
		//   mockPoWCommitments,
		//   config.mongoCaptchaUri,
		// );

		expect(providerDB.markDappUserCommitmentsStored).toHaveBeenCalledWith([]);
		expect(providerDB.markDappUserPoWCommitmentsStored).toHaveBeenCalledWith(
			mockPoWCommitments.map((c) => c.challenge),
		);

		expect(providerDB.updateScheduledTaskStatus).toHaveBeenCalledWith(
			Number.parseInt(mockLastScheduledTask._id as any) + 1,
			ScheduledTaskStatus.Completed,
			{
				data: {
					commitments: [],
					powRecords: mockPoWCommitments.map((c) => c.challenge),
				},
			},
		);
	});

	it("should not call saveCaptchas if there is nothing to save", async () => {
		// Create a mock last scheduled task
		const mockLastScheduledTask: Pick<
			ScheduledTaskRecord,
			"updated" | "_id" | "status" | "processName"
		> = {
			_id: 0,
			status: ScheduledTaskStatus.Completed,
			processName: ScheduledTaskNames.StoreCommitmentsExternal,
			// Last task ran at time 1
			updated: 1,
		};

		// Put the mock last scheduled task in the collection
		collections.schedulers.records[0] = mockLastScheduledTask;

		// Update the next ID and time (time is used as a timestamp)
		collections.schedulers.nextID += 1;
		collections.schedulers.time = 2;

		// biome-ignore lint/suspicious/noExplicitAny: TODO fix
		(providerDB.getUnstoredDappUserCommitments as any).mockResolvedValue([]);

		// biome-ignore lint/suspicious/noExplicitAny: TODO fix
		(providerDB.getUnstoredDappUserPoWCommitments as any).mockResolvedValue([]);

		await clientTaskManager.storeCommitmentsExternal();

		expect(providerDB.markDappUserCommitmentsStored).not.toHaveBeenCalled();
		expect(providerDB.markDappUserPoWCommitmentsStored).not.toHaveBeenCalled();

		expect(providerDB.updateScheduledTaskStatus).toHaveBeenCalledWith(
			Number.parseInt(mockLastScheduledTask._id as any) + 1,
			ScheduledTaskStatus.Completed,
			{
				data: {
					commitments: [],
					powRecords: [],
				},
			},
		);
	});
});
