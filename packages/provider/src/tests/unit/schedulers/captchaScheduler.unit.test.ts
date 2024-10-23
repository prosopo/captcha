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

import type { KeyringPair } from "@polkadot/keyring/types";
import { ProviderEnvironment } from "@prosopo/env";
import type { ProsopoConfigOutput } from "@prosopo/types";
import { CronJob } from "cron";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { storeCaptchasExternally } from "../../../schedulers/captchaScheduler.js";
import { Tasks } from "../../../tasks/tasks.js";
import { storeCaptchaWorker } from "../../../workers/storeCaptchaWorker.js";

vi.mock("@prosopo/env", () => ({
	ProviderEnvironment: vi.fn().mockImplementation(() => ({
		isReady: vi.fn().mockResolvedValue(true),
		logger: {
			debug: vi.fn().mockImplementation(console.debug),
			log: vi.fn().mockImplementation(console.log),
			info: vi.fn().mockImplementation(console.info),
			error: vi.fn().mockImplementation(console.error),
		},
		getDb: vi.fn().mockReturnValue({
			getLastScheduledTaskStatus: vi.fn().mockResolvedValue(undefined),
		}),
		db: {
			getLastScheduledTaskStatus: vi.fn().mockResolvedValue(undefined),
		},
	})),
}));

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

vi.mock("node:worker_threads", () => ({
	isMainThread: vi.fn().mockReturnValue(true),
	threadId: vi.fn().mockReturnValue(0),
	parentPort: {
		postMessage: vi.fn(),
	},
	Worker: vi.fn().mockImplementation((url, options) => ({
		on: vi.fn(),
	})),
	workerData: {
		config: {
			account: {
				secret:
					"puppy cream effort carbon despair leg pyramid cotton endorse immense drill peasant",
			},
			scheduledTasks: {
				captchaScheduler: {
					schedule: "0 * * * *",
				},
			},
		},
	},
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
		await storeCaptchasExternally(mockConfig);

		expect(CronJob).toHaveBeenCalledWith("0 * * * *", expect.any(Function));
	});

	it("should initialize environment and start cron job", async () => {
		await storeCaptchaWorker();
		expect(ProviderEnvironment).toHaveBeenCalled();
		expect(Tasks).toHaveBeenCalled();
	});

	it("should log message when cron job runs", async () => {
		await storeCaptchaWorker();
		// biome-ignore lint/suspicious/noExplicitAny: TODO fix
		const envInstance = (ProviderEnvironment as any).mock.results[0].value;
		expect(envInstance.logger.info).toHaveBeenNthCalledWith(
			1,
			"StoreCommitmentsExternal task running: false",
		);
	});
});
