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

import { type Logger, getLogger } from "@prosopo/common";
import { ProviderEnvironment } from "@prosopo/env";
import type { KeyringPair } from "@prosopo/types";
import { type ProsopoConfigOutput, ScheduledTaskNames } from "@prosopo/types";
import { CronJob } from "cron";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { setClientEntropy } from "../../../schedulers/setClientEntropy.js";
import { Tasks } from "../../../tasks/tasks.js";
import { checkIfTaskIsRunning } from "../../../util.js";

vi.mock("@prosopo/env", () => {
	const loggerOuter = getLogger("info", import.meta.url);
	const mockLogger = {
		debug: vi.fn().mockImplementation(loggerOuter.debug.bind(loggerOuter)),
		log: vi.fn().mockImplementation(loggerOuter.log.bind(loggerOuter)),
		info: vi.fn().mockImplementation(loggerOuter.info.bind(loggerOuter)),
		error: vi.fn().mockImplementation(loggerOuter.error.bind(loggerOuter)),
		trace: vi.fn().mockImplementation(loggerOuter.trace.bind(loggerOuter)),
		fatal: vi.fn().mockImplementation(loggerOuter.fatal.bind(loggerOuter)),
		warn: vi.fn().mockImplementation(loggerOuter.warn.bind(loggerOuter)),
	} as unknown as Logger;
	return {
		ProviderEnvironment: vi.fn().mockImplementation(() => ({
			isReady: vi.fn().mockResolvedValue(true),
			logger: mockLogger,
			getDb: vi.fn().mockReturnValue({
				getLastScheduledTaskStatus: vi.fn().mockResolvedValue(undefined),
			}),
		})),
	};
});

vi.mock("../../../tasks/tasks.js", () => ({
	Tasks: vi.fn(),
}));

vi.mock("../../../util.js", () => ({
	checkIfTaskIsRunning: vi.fn(),
}));

vi.mock("cron", () => ({
	CronJob: vi.fn(),
}));

describe("setClientEntropy", () => {
	let mockPair: KeyringPair;
	let mockConfig: ProsopoConfigOutput;
	let mockTasks: {
		clientTaskManager: {
			calculateClientEntropy: ReturnType<typeof vi.fn>;
		};
	};
	let mockCronJob: {
		start: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockPair = {} as KeyringPair;
		mockConfig = {} as ProsopoConfigOutput;
		mockTasks = {
			clientTaskManager: {
				calculateClientEntropy: vi.fn().mockResolvedValue(undefined),
			},
		};
		mockCronJob = {
			start: vi.fn(),
		};

		vi.mocked(Tasks).mockImplementation(() => mockTasks as unknown as Tasks);
		vi.mocked(checkIfTaskIsRunning).mockResolvedValue(false);
		vi.mocked(CronJob).mockImplementation(
			(cronSchedule, onTick) =>
				({
					start: mockCronJob.start,
					cronSchedule,
					onTick,
				}) as unknown as CronJob,
		);
	});

	it("creates ProviderEnvironment and waits for readiness", async () => {
		await setClientEntropy(mockPair, "0 0 * * *", mockConfig);

		expect(ProviderEnvironment).toHaveBeenCalledWith(mockConfig, mockPair);
		const envInstance = vi.mocked(ProviderEnvironment).mock.results[0]?.value;
		expect(envInstance?.isReady).toHaveBeenCalled();
	});

	it("creates Tasks instance", async () => {
		await setClientEntropy(mockPair, "0 0 * * *", mockConfig);

		expect(Tasks).toHaveBeenCalled();
	});

	it("creates CronJob with correct schedule", async () => {
		await setClientEntropy(mockPair, "0 0 * * *", mockConfig);

		expect(CronJob).toHaveBeenCalledWith("0 0 * * *", expect.any(Function));
	});

	it("starts the cron job", async () => {
		await setClientEntropy(mockPair, "0 0 * * *", mockConfig);

		expect(mockCronJob.start).toHaveBeenCalled();
	});

	it("checks if task is running before executing", async () => {
		await setClientEntropy(mockPair, "0 0 * * *", mockConfig);

		const cronJobCall = vi.mocked(CronJob).mock.calls[0];
		const onTick = cronJobCall?.[1] as () => Promise<void>;
		await onTick();

		expect(checkIfTaskIsRunning).toHaveBeenCalledWith(
			ScheduledTaskNames.SetClientEntropy,
			expect.anything(),
		);
	});

	it("executes calculateClientEntropy when task is not running", async () => {
		await setClientEntropy(mockPair, "0 0 * * *", mockConfig);

		const cronJobCall = vi.mocked(CronJob).mock.calls[0];
		const onTick = cronJobCall?.[1] as () => Promise<void>;
		await onTick();

		expect(
			mockTasks.clientTaskManager.calculateClientEntropy,
		).toHaveBeenCalled();
	});

	it("does not execute calculateClientEntropy when task is already running", async () => {
		vi.mocked(checkIfTaskIsRunning).mockResolvedValue(true);

		await setClientEntropy(mockPair, "0 0 * * *", mockConfig);

		const cronJobCall = vi.mocked(CronJob).mock.calls[0];
		const onTick = cronJobCall?.[1] as () => Promise<void>;
		await onTick();

		expect(
			mockTasks.clientTaskManager.calculateClientEntropy,
		).not.toHaveBeenCalled();
	});

	it("handles errors in calculateClientEntropy", async () => {
		const error = new Error("Test error");
		mockTasks.clientTaskManager.calculateClientEntropy.mockRejectedValue(error);

		await setClientEntropy(mockPair, "0 0 * * *", mockConfig);

		const cronJobCall = vi.mocked(CronJob).mock.calls[0];
		const onTick = cronJobCall?.[1] as () => Promise<void>;
		await onTick();

		expect(
			mockTasks.clientTaskManager.calculateClientEntropy,
		).toHaveBeenCalled();
	});
});
