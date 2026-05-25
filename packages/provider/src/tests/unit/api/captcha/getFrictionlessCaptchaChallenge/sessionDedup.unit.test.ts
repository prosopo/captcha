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

import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveSessionDedup } from "../../../../../api/captcha/getFrictionlessCaptchaChallenge/sessionDedup.js";

const buildTasks = () => ({
	db: {
		getSessionRecordByToken: vi.fn().mockResolvedValue(null),
		getSessionByuserSitekeyIpHash: vi.fn().mockResolvedValue(null),
	},
	writeQueue: {
		getCachedSessionByHash: vi.fn().mockResolvedValue(null),
		invalidateCachedSession: vi.fn().mockResolvedValue(undefined),
		invalidateCachedSessionByHash: vi.fn().mockResolvedValue(undefined),
	},
});

const logger = {
	info: vi.fn(),
	warn: vi.fn(),
	debug: vi.fn(),
	error: vi.fn(),
};

describe("resolveSessionDedup", () => {
	beforeEach(() => {
		for (const fn of Object.values(logger)) fn.mockReset();
	});

	it("returns dedup=null when neither token nor hash hits Mongo", async () => {
		const tasks = buildTasks();
		const r = await resolveSessionDedup(
			tasks as never,
			"tok",
			"hash",
			logger as never,
		);
		expect(r.dedup).toBeNull();
		expect(r.existingToken).toBeNull();
	});

	it("returns the Mongo session when present", async () => {
		const tasks = buildTasks();
		const session = {
			sessionId: "sid",
			captchaType: "pow",
			userSitekeyIpHash: "hash",
		};
		tasks.db.getSessionByuserSitekeyIpHash.mockResolvedValueOnce(session);

		const r = await resolveSessionDedup(
			tasks as never,
			"tok",
			"hash",
			logger as never,
		);
		expect(r.dedup).toEqual({
			sessionId: "sid",
			captchaType: "pow",
			session,
		});
		// Mongo had the session — no stale-pointer eviction should fire.
		expect(tasks.writeQueue.getCachedSessionByHash).not.toHaveBeenCalled();
	});

	it("never consults Redis as the dedup source", async () => {
		const tasks = buildTasks();
		// Even though Redis has a pointer, dedup is null because Mongo has nothing.
		tasks.writeQueue.getCachedSessionByHash.mockResolvedValueOnce("stale-sid");

		const r = await resolveSessionDedup(
			tasks as never,
			"tok",
			"hash",
			logger as never,
		);
		expect(r.dedup).toBeNull();
		// Stale pointer found → eviction fires.
		expect(tasks.writeQueue.invalidateCachedSessionByHash).toHaveBeenCalledWith(
			"hash",
		);
		expect(tasks.writeQueue.invalidateCachedSession).toHaveBeenCalledWith(
			"stale-sid",
		);
		expect(logger.warn).toHaveBeenCalled();
	});

	it("does not attempt eviction when there's no Redis pointer to evict", async () => {
		const tasks = buildTasks();
		// getCachedSessionByHash returns null (default).
		await resolveSessionDedup(tasks as never, "tok", "hash", logger as never);
		expect(tasks.writeQueue.invalidateCachedSession).not.toHaveBeenCalled();
		expect(
			tasks.writeQueue.invalidateCachedSessionByHash,
		).not.toHaveBeenCalled();
	});

	it("surfaces existingToken from getSessionRecordByToken", async () => {
		const tasks = buildTasks();
		tasks.db.getSessionRecordByToken.mockResolvedValueOnce({ token: "used" });

		const r = await resolveSessionDedup(
			tasks as never,
			"tok",
			"hash",
			logger as never,
		);
		expect(r.existingToken).toEqual({ token: "used" });
	});
});
