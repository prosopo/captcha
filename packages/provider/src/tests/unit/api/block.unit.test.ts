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

import { ALWAYS_FAIL_SITE_KEY, ALWAYS_PASS_SITE_KEY } from "@prosopo/types";
import type { ProviderEnvironment } from "@prosopo/types-env";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BlacklistRequestInspector } from "../../../api/blacklistRequestInspector.js";
import { blockMiddleware } from "../../../api/block.js";

vi.mock("../../../api/blacklistRequestInspector.js");

describe("blockMiddleware", () => {
	beforeEach(() => {
		vi.mocked(BlacklistRequestInspector).mockClear();
		process.env.MAINTENANCE_MODE = undefined;
	});

	afterEach(() => {
		process.env.MAINTENANCE_MODE = undefined;
	});
	const buildMockEnv = (
		getUserAccessRulesStorageImpl: () => unknown = () => ({
			get: vi.fn(),
			set: vi.fn(),
		}),
	) => {
		const mockDb = {
			getUserAccessRulesStorage: vi.fn(getUserAccessRulesStorageImpl),
		};
		return {
			env: {
				getDb: vi.fn().mockReturnValue(mockDb),
				isReady: vi.fn(),
			} as unknown as ProviderEnvironment,
			mockDb,
		};
	};

	it("constructs BlacklistRequestInspector lazily on first request", async () => {
		const { env, mockDb } = buildMockEnv();
		const mockAbort = vi.fn();
		// blockMiddleware does `new BlacklistRequestInspector(...)`. vitest 4 no
		// longer routes mockReturnValue through a construct call — the mock's own
		// [[Construct]] wins and the returned stub is ignored — so the
		// implementation has to be a constructible function.
		vi.mocked(BlacklistRequestInspector).mockImplementation(function () {
			return {
				abortRequestForBlockedUsers: mockAbort,
			} as never;
		});

		const middleware = blockMiddleware(env);

		// Eager phase: nothing constructed yet, storage not touched.
		expect(BlacklistRequestInspector).not.toHaveBeenCalled();
		expect(mockDb.getUserAccessRulesStorage).not.toHaveBeenCalled();

		await middleware({} as never, {} as never, vi.fn() as never);

		// Lazy phase: inspector built and wired on first hit.
		expect(BlacklistRequestInspector).toHaveBeenCalledTimes(1);
		expect(mockAbort).toHaveBeenCalledTimes(1);
	});

	it("skips the blocklist check entirely when maintenance mode is on", async () => {
		process.env.MAINTENANCE_MODE = "true";
		const { env, mockDb } = buildMockEnv();

		const middleware = blockMiddleware(env);
		const next = vi.fn();
		await middleware({} as never, {} as never, next);

		// next() invoked directly; the DB/storage is never consulted and no
		// inspector is built, so a down Redis can't gate maintenance requests.
		expect(next).toHaveBeenCalledTimes(1);
		expect(BlacklistRequestInspector).not.toHaveBeenCalled();
		expect(mockDb.getUserAccessRulesStorage).not.toHaveBeenCalled();
	});

	it("skips the blocklist check when access-rules storage is unavailable", async () => {
		const { env } = buildMockEnv(() => {
			throw new Error("storage not ready");
		});

		const middleware = blockMiddleware(env);
		const next = vi.fn();
		await middleware({} as never, {} as never, next);

		// next() invoked directly; no inspector built.
		expect(next).toHaveBeenCalledTimes(1);
		expect(BlacklistRequestInspector).not.toHaveBeenCalled();
	});

	it("caches the inspector across requests", async () => {
		const { env } = buildMockEnv();
		const mockAbort = vi.fn();
		// blockMiddleware does `new BlacklistRequestInspector(...)`. vitest 4 no
		// longer routes mockReturnValue through a construct call — the mock's own
		// [[Construct]] wins and the returned stub is ignored — so the
		// implementation has to be a constructible function.
		vi.mocked(BlacklistRequestInspector).mockImplementation(function () {
			return {
				abortRequestForBlockedUsers: mockAbort,
			} as never;
		});

		const middleware = blockMiddleware(env);
		await middleware({} as never, {} as never, vi.fn() as never);
		await middleware({} as never, {} as never, vi.fn() as never);

		expect(BlacklistRequestInspector).toHaveBeenCalledTimes(1);
		expect(mockAbort).toHaveBeenCalledTimes(2);
	});

	it("skips the blocklist check for a reserved test site key", async () => {
		const { env, mockDb } = buildMockEnv();

		const middleware = blockMiddleware(env);
		const next = vi.fn();
		await middleware(
			{ headers: { "prosopo-site-key": ALWAYS_PASS_SITE_KEY } } as never,
			{} as never,
			next,
		);

		// This is the whole point of the exemption: the blocklist decides on
		// IP/JA4/ASN before any site-key logic runs, so without it a reserved
		// key cannot make a suite deterministic on a blocked runner.
		expect(next).toHaveBeenCalledTimes(1);
		expect(BlacklistRequestInspector).not.toHaveBeenCalled();
		expect(mockDb.getUserAccessRulesStorage).not.toHaveBeenCalled();
	});

	it("skips the blocklist check for the reserved always-fail key too", async () => {
		const { env } = buildMockEnv();

		const middleware = blockMiddleware(env);
		const next = vi.fn();
		await middleware(
			{ headers: { "prosopo-site-key": ALWAYS_FAIL_SITE_KEY } } as never,
			{} as never,
			next,
		);

		// Both reserved keys serve the same invisible flow; a suite asserting
		// the failure path must be as reachable as one asserting the pass path.
		expect(next).toHaveBeenCalledTimes(1);
		expect(BlacklistRequestInspector).not.toHaveBeenCalled();
	});

	it("still runs the blocklist check for a normal site key", async () => {
		const { env } = buildMockEnv();
		const mockAbort = vi.fn();
		vi.mocked(BlacklistRequestInspector).mockImplementation(function () {
			return {
				abortRequestForBlockedUsers: mockAbort,
			} as never;
		});

		const middleware = blockMiddleware(env);
		const next = vi.fn();
		await middleware(
			{
				headers: {
					"prosopo-site-key":
						"5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
				},
			} as never,
			{} as never,
			next,
		);

		// The exemption must not widen into "any site key skips the blocklist".
		expect(BlacklistRequestInspector).toHaveBeenCalledTimes(1);
		expect(mockAbort).toHaveBeenCalledTimes(1);
		expect(next).not.toHaveBeenCalled();
	});
});
