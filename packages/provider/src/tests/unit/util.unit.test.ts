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
import { ScheduledTaskNames } from "@prosopo/types";
import type {
	IProviderDatabase,
	ScheduledTaskRecord,
} from "@prosopo/types-database";
import { describe, expect, it, vi } from "vitest";
import { checkIfTaskIsRunning } from "../../util.js";

describe("checkIfTaskIsRunning", () => {
	it("should return false if the task is not running", async () => {
		const taskName = ScheduledTaskNames.StoreCommitmentsExternal;
		const db = {
			getLastScheduledTaskStatus: vi.fn().mockResolvedValue(null),
		} as unknown as IProviderDatabase;
		const result = await checkIfTaskIsRunning(taskName, db);
		expect(result).toBe(false);
	});
	it("should return false if the task is running and completed", async () => {
		const taskName = ScheduledTaskNames.StoreCommitmentsExternal;
		const db = {
			getLastScheduledTaskStatus: vi
				.fn()
				.mockResolvedValue({ _id: "123" } as Pick<ScheduledTaskRecord, "_id">),
			getScheduledTaskStatus: vi.fn().mockResolvedValue({
				_id: "123",
				status: "Completed",
			} as Pick<ScheduledTaskRecord, "_id" | "status">),
		} as unknown as IProviderDatabase;
		const result = await checkIfTaskIsRunning(taskName, db);
		expect(result).toBe(false);
	});
	it("should return true if the task is running and not completed", async () => {
		const taskName = ScheduledTaskNames.StoreCommitmentsExternal;
		const db = {
			getLastScheduledTaskStatus: vi
				.fn()
				.mockResolvedValue({ _id: "123" } as Pick<ScheduledTaskRecord, "_id">),
			getScheduledTaskStatus: vi.fn().mockResolvedValue(null),
		} as unknown as IProviderDatabase;
		const result = await checkIfTaskIsRunning(taskName, db);
		expect(result).toBe(true);
	});
});
