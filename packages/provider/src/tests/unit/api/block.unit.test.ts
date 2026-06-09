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

import type { ProviderEnvironment } from "@prosopo/types-env";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BlacklistRequestInspector } from "../../../api/blacklistRequestInspector.js";
import { blockMiddleware } from "../../../api/block.js";

vi.mock("../../../api/blacklistRequestInspector.js");

describe("blockMiddleware", () => {
	beforeEach(() => {
		vi.mocked(BlacklistRequestInspector).mockClear();
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
		vi.mocked(BlacklistRequestInspector).mockReturnValue({
			abortRequestForBlockedUsers: mockAbort,
		} as never);

		const middleware = blockMiddleware(env);

		// Eager phase: nothing constructed yet, storage not touched.
		expect(BlacklistRequestInspector).not.toHaveBeenCalled();
		expect(mockDb.getUserAccessRulesStorage).not.toHaveBeenCalled();

		await middleware({} as never, {} as never, vi.fn() as never);

		// Lazy phase: inspector built and wired on first hit.
		expect(BlacklistRequestInspector).toHaveBeenCalledTimes(1);
		expect(mockAbort).toHaveBeenCalledTimes(1);
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
		vi.mocked(BlacklistRequestInspector).mockReturnValue({
			abortRequestForBlockedUsers: mockAbort,
		} as never);

		const middleware = blockMiddleware(env);
		await middleware({} as never, {} as never, vi.fn() as never);
		await middleware({} as never, {} as never, vi.fn() as never);

		expect(BlacklistRequestInspector).toHaveBeenCalledTimes(1);
		expect(mockAbort).toHaveBeenCalledTimes(2);
	});
});
