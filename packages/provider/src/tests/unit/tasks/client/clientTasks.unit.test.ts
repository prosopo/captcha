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

vi.mock(
	"@prosopo/database",
	async (
		importOriginal: () => // biome-ignore lint/suspicious/noExplicitAny: <explanation>
			| Record<string, any>
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			| PromiseLike<Record<string, any>>,
	) => {
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		const actual = (await importOriginal()) as Record<string, any>;

		const mockLogger = {
			info: vi.fn().mockImplementation(console.info),
			debug: vi.fn().mockImplementation(console.debug),
			error: vi.fn().mockImplementation(console.error),
		};

		class MockCaptchaDatabase {
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
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
	},
);

describe("ClientTaskManager", () => {
	let config: ProsopoConfigOutput;
	let logger: Logger;
	let providerDB: IProviderDatabase;
	let clientTaskManager: ClientTaskManager;
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
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
		(providerDB.getUnstoredDappUserCommitments as any).mockResolvedValueOnce(
			mockCommitments,
		);

		// biome-ignore lint/suspicious/noExplicitAny: TODO fix
		(providerDB.createScheduledTaskStatus as any).mockResolvedValueOnce({});

		// biome-ignore lint/suspicious/noExplicitAny: TODO fix
		(providerDB.updateScheduledTaskStatus as any).mockResolvedValueOnce({});

		// biome-ignore lint/suspicious/noExplicitAny: TODO fix
		(providerDB.getUnstoredDappUserPoWCommitments as any).mockResolvedValueOnce(
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
			"id" | "lastUpdatedTimestamp" | "storedAtTimestamp"
		>[] = [
			{
				id: "commitment1",
				// Image commitments were stored at time 1
				lastUpdatedTimestamp: 1,
				storedAtTimestamp: 1,
			},
		];

		const mockPoWCommitments: Pick<
			PoWCaptchaStored,
			"challenge" | "lastUpdatedTimestamp" | "storedAtTimestamp"
		>[] = [
			{
				challenge: "1234567___userAccount___dappAccount",
				// PoW commitments were stored at time 3
				lastUpdatedTimestamp: 3,
				storedAtTimestamp: 1,
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
		logger.info("Test: Collections state updated", {
			nextID: collections.schedulers.nextID,
			currentTime: collections.schedulers.time,
		});

		// biome-ignore lint/suspicious/noExplicitAny: TODO fix
		(providerDB.getUnstoredDappUserCommitments as any).mockResolvedValueOnce(
			mockCommitments,
		);
		// biome-ignore lint/suspicious/noExplicitAny: TODO fix
		(providerDB.getUnstoredDappUserPoWCommitments as any).mockResolvedValueOnce(
			mockPoWCommitments,
		);
		logger.info("Test: Mock DB responses configured");

		await clientTaskManager.storeCommitmentsExternal();
		logger.info("Test: storeCommitmentsExternal completed");

		// Verification steps with logging
		expect(providerDB.getUnstoredDappUserCommitments).toHaveBeenCalled();
		expect(providerDB.getUnstoredDappUserPoWCommitments).toHaveBeenCalled();
		logger.info("Test: Verified DB queries were made");

		expect(providerDB.getLastScheduledTaskStatus).toHaveReturnedWith(
			mockLastScheduledTask,
		);
		logger.info("Test: Verified last scheduled task status");

		expect(providerDB.createScheduledTaskStatus).toHaveBeenCalledWith(
			ScheduledTaskNames.StoreCommitmentsExternal,
			ScheduledTaskStatus.Running,
		);
		logger.info("Test: Verified task status creation");

		expect(providerDB.markDappUserCommitmentsStored).not.toHaveBeenCalled();
		logger.info(
			"Test: Verified no image commitments were marked as stored (expected as they're old)",
		);

		const expectedPoWChallenges = mockPoWCommitments.map((c) => c.challenge);
		expect(providerDB.markDappUserPoWCommitmentsStored).toHaveBeenCalledWith(
			expectedPoWChallenges,
		);
		logger.info("Test: Verified PoW commitments were marked as stored", {
			expectedPoWChallenges,
		});

		expect(providerDB.updateScheduledTaskStatus).toHaveBeenCalledWith(
			// biome-ignore lint/suspicious/noExplicitAny: TODO fi
			Number.parseInt(mockLastScheduledTask._id as any) + 1,
			ScheduledTaskStatus.Completed,
			{
				data: {
					processedCommitments: 0,
					processedPowRecords: 1,
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
		(providerDB.getUnstoredDappUserCommitments as any).mockResolvedValueOnce(
			[],
		);

		// biome-ignore lint/suspicious/noExplicitAny: TODO fix
		(providerDB.getUnstoredDappUserPoWCommitments as any).mockResolvedValueOnce(
			[],
		);

		await clientTaskManager.storeCommitmentsExternal();

		expect(providerDB.markDappUserCommitmentsStored).not.toHaveBeenCalled();
		expect(providerDB.markDappUserPoWCommitmentsStored).not.toHaveBeenCalled();

		expect(providerDB.updateScheduledTaskStatus).toHaveBeenCalledWith(
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			Number.parseInt(mockLastScheduledTask._id as any) + 1,
			ScheduledTaskStatus.Completed,
			{
				data: {
					processedCommitments: 0,
					processedPowRecords: 0,
				},
			},
		);
	});

	describe("isSubdomainOrExactMatch", () => {
		it("should match exact domains", () => {
			expect(
				clientTaskManager.isSubdomainOrExactMatch(
					"example.com",
					"https://example.com",
				),
			).toBe(true);
			expect(
				clientTaskManager.isSubdomainOrExactMatch(
					"example.com",
					"http://example.com",
				),
			).toBe(true);
			expect(
				clientTaskManager.isSubdomainOrExactMatch(
					"example.com",
					"https://example.com/",
				),
			).toBe(true);
		});

		it("should match subdomains", () => {
			expect(
				clientTaskManager.isSubdomainOrExactMatch(
					"test.example.com",
					"example.com",
				),
			).toBe(true);
			expect(
				clientTaskManager.isSubdomainOrExactMatch(
					"a.b.example.com",
					"example.com",
				),
			).toBe(true);
			expect(
				clientTaskManager.isSubdomainOrExactMatch(
					"dev.test.example.com",
					"test.example.com",
				),
			).toBe(true);
			expect(
				clientTaskManager.isSubdomainOrExactMatch(
					"0.0.0.0",
					"http://0.0.0.0:9230",
				),
			).toBe(true);
		});

		it("should not match different domains", () => {
			expect(
				clientTaskManager.isSubdomainOrExactMatch("example.com", "example.org"),
			).toBe(false);
			expect(
				clientTaskManager.isSubdomainOrExactMatch(
					"test.example.com",
					"testexample.com",
				),
			).toBe(false);
			expect(
				clientTaskManager.isSubdomainOrExactMatch(
					"example.com",
					"malicious-example.com",
				),
			).toBe(false);
		});

		it("should handle localhost specially", () => {
			// Valid localhost cases
			expect(
				clientTaskManager.isSubdomainOrExactMatch("localhost", "localhost"),
			).toBe(true);
			expect(
				clientTaskManager.isSubdomainOrExactMatch(
					"localhost:3000",
					"localhost",
				),
			).toBe(true);

			// Invalid localhost cases
			expect(
				clientTaskManager.isSubdomainOrExactMatch(
					"localhost.test.com",
					"localhost",
				),
			).toBe(false);
			expect(
				clientTaskManager.isSubdomainOrExactMatch(
					"malicious.com/localhost",
					"localhost",
				),
			).toBe(false);
			expect(
				clientTaskManager.isSubdomainOrExactMatch(
					"evil.com?localhost",
					"localhost",
				),
			).toBe(false);
			expect(
				clientTaskManager.isSubdomainOrExactMatch(
					"localhost.malicious.com",
					"localhost",
				),
			).toBe(false);
		});

		it("should handle edge cases", () => {
			expect(clientTaskManager.isSubdomainOrExactMatch("", "example.com")).toBe(
				false,
			);
			expect(clientTaskManager.isSubdomainOrExactMatch("example.com", "")).toBe(
				false,
			);
			expect(
				clientTaskManager.isSubdomainOrExactMatch(
					"example.com.",
					"example.com",
				),
			).toBe(true); // trailing dot
			expect(
				clientTaskManager.isSubdomainOrExactMatch(
					"example.com",
					"example.com.",
				),
			).toBe(true); // trailing dot
		});

		it("should handle URLs with paths and protocols", () => {
			expect(
				clientTaskManager.isSubdomainOrExactMatch(
					"test.example.com",
					"https://example.com/path",
				),
			).toBe(true);
			expect(
				clientTaskManager.isSubdomainOrExactMatch(
					"example.com",
					"https://example.com:3000",
				),
			).toBe(true);
			expect(
				clientTaskManager.isSubdomainOrExactMatch(
					"example.com",
					"example.com:3000",
				),
			).toBe(true);
		});

		it("should handle exotic domain names", () => {
			expect(
				clientTaskManager.isSubdomainOrExactMatch(
					"⭐⭐⭐⭐.com",
					"⭐⭐⭐⭐.com",
				),
			).toBe(true);
			expect(
				clientTaskManager.isSubdomainOrExactMatch(
					"test.⭐⭐⭐⭐.com",
					"⭐⭐⭐⭐.com",
				),
			).toBe(true);

			expect(
				clientTaskManager.isSubdomainOrExactMatch(
					"漢字漢字漢字.com",
					"漢字漢字漢字.com",
				),
			).toBe(true);
			expect(
				clientTaskManager.isSubdomainOrExactMatch(
					"test.漢字漢字漢字.com",
					"漢字漢字漢字.com",
				),
			).toBe(true);

			expect(
				clientTaskManager.isSubdomainOrExactMatch(
					"🦄.⭐.漢字.test.com",
					"test.com",
				),
			).toBe(true);

			expect(
				clientTaskManager.isSubdomainOrExactMatch(
					`${"a".repeat(63)}.example.com`,
					"example.com",
				),
			).toBe(true);

			expect(
				clientTaskManager.isSubdomainOrExactMatch(
					"xn--h28h.com", // 🌟.com in punycode
					"xn--h28h.com",
				),
			).toBe(true);

			expect(
				clientTaskManager.isSubdomainOrExactMatch(
					"café.漢字.⭐.example.com",
					"example.com",
				),
			).toBe(true);

			expect(
				clientTaskManager.isSubdomainOrExactMatch(
					"123-456.⭐-漢字.com",
					"⭐-漢字.com",
				),
			).toBe(true);

			expect(
				clientTaskManager.isSubdomainOrExactMatch(
					"🦄.xn--h28h.café.123-456.⭐.漢字.test.com",
					"test.com",
				),
			).toBe(true);

			expect(
				clientTaskManager.isSubdomainOrExactMatch(
					"..⭐⭐⭐⭐..com",
					"⭐⭐⭐⭐.com",
				),
			).toBe(false);
		});
	});
});
