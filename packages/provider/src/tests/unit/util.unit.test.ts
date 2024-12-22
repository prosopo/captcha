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
