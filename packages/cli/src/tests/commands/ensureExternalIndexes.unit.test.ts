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

import { LogLevel, getLogger } from "@prosopo/logger";
import type { KeyringPair, ProsopoConfigOutput } from "@prosopo/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import commandEnsureExternalIndexes from "../../commands/ensureExternalIndexes.js";

const calls: string[] = [];

const captchaDB = {
	connect: vi.fn(async (): Promise<void> => {
		calls.push("connect");
	}),
	ensureIndexes: vi.fn(async (): Promise<void> => {
		calls.push("ensureIndexes");
	}),
	close: vi.fn(async (): Promise<void> => {
		calls.push("close");
	}),
};

const logger = getLogger(LogLevel.enum.error, "ensureExternalIndexes.test");

vi.mock("@prosopo/env", () => ({
	ProviderEnvironment: class {
		config = { mongoCaptchaUri: "mongodb://central.example:27017" };
		logger = logger;
		async isReady(): Promise<void> {}
	},
}));

vi.mock("@prosopo/provider", () => ({
	Tasks: class {
		clientTaskManager = {
			getCaptchaDB: (_mongoCaptchaUri: string): typeof captchaDB => captchaDB,
		};
	},
}));

const runCommand = async (): Promise<void> => {
	const command = commandEnsureExternalIndexes(
		{} as KeyringPair,
		{} as ProsopoConfigOutput,
		{ logger },
	);
	await command.handler();
};

describe("ensure_external_indexes", () => {
	beforeEach(() => {
		calls.length = 0;
		vi.clearAllMocks();
	});

	it("connects to the central database before ensuring its indexes, then closes it", async () => {
		await runCommand();

		expect(calls).toEqual(["connect", "ensureIndexes", "close"]);
	});

	it("closes the central database when ensuring indexes fails", async () => {
		captchaDB.ensureIndexes.mockRejectedValueOnce(new Error("index failure"));

		await runCommand();

		expect(captchaDB.close).toHaveBeenCalledTimes(1);
	});
});
