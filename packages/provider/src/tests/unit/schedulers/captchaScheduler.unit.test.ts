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

import { type Logger, getLogger } from "@prosopo/common";
import { ProviderEnvironment } from "@prosopo/env";
import type { KeyringPair } from "@prosopo/types";
import { type ProsopoConfigOutput, ScheduledTaskNames } from "@prosopo/types";
import { CronJob } from "cron";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { storeCaptchasExternally } from "../../../schedulers/captchaScheduler.js";
import { Tasks } from "../../../tasks/tasks.js";

const logger = getLogger("info", import.meta.url);

vi.mock("@prosopo/env", () => {
	const mockLogger = {
		debug: vi.fn().mockImplementation(logger.debug),
		log: vi.fn().mockImplementation(logger.log),
		info: vi.fn().mockImplementation(logger.info),
		error: vi.fn().mockImplementation(logger.error),
		trace: vi.fn().mockImplementation(logger.trace),
		fatal: vi.fn().mockImplementation(logger.fatal),
		warn: vi.fn().mockImplementation(logger.warn),
	} as unknown as Logger;
	return {
		ProviderEnvironment: vi.fn().mockImplementation(() => ({
			isReady: vi.fn().mockResolvedValue(true),
			logger: mockLogger,
			getDb: vi.fn().mockReturnValue({
				getLastScheduledTaskStatus: vi.fn().mockResolvedValue(undefined),
			}),
			db: {
				getLastScheduledTaskStatus: vi.fn().mockResolvedValue(undefined),
			},
		})),
	};
});

vi.mock("../../../tasks/tasks.js", () => ({
	Tasks: vi.fn().mockImplementation(() => ({
		clientTaskManager: {
			storeCommitmentsExternal: vi.fn().mockResolvedValue(undefined),
		},
	})),
}));

vi.mock("cron", () => ({
	CronJob: vi.fn().mockImplementation((cronTime, onTick) => ({
		start: vi.fn().mockImplementation(onTick),
	})),
}));

vi.mock("../../../util.js", () => ({
	checkIfTaskIsRunning: vi.fn().mockResolvedValue(false),
}));

describe("storeCaptchasExternally", () => {
	let mockPair: KeyringPair;
	let mockConfig: ProsopoConfigOutput;

	beforeEach(() => {
		mockPair = {} as KeyringPair;
		mockConfig = {
			scheduledTasks: {
				captchaScheduler: {
					schedule: "0 * * * *",
				},
			},
		} as ProsopoConfigOutput;
	});

	it("should initialize environment and start cron job", async () => {
		await storeCaptchasExternally(mockPair, "0 * * * *", mockConfig);

		expect(ProviderEnvironment).toHaveBeenCalledWith(mockConfig, mockPair);
		expect(Tasks).toHaveBeenCalled();
		expect(CronJob).toHaveBeenCalledWith("0 * * * *", expect.any(Function));
	});

	it("should log message when cron job runs", async () => {
		await storeCaptchasExternally(mockPair, "0 * * * *", mockConfig);

		// biome-ignore lint/suspicious/noExplicitAny: TODO fix
		const envInstance = (ProviderEnvironment as any).mock.results[0].value;
		const logFn = envInstance.logger.info.mock.calls[0][0];
		const logObj = logFn();
		expect(logObj).toMatchObject({
			msg: "StoreCommitmentsExternal task running: false",
		});
	});
});
