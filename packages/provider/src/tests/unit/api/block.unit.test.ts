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
import { describe, expect, it, vi } from "vitest";
import { BlacklistRequestInspector } from "../../../api/blacklistRequestInspector.js";
import { blockMiddleware } from "../../../api/block.js";

vi.mock("../../../api/blacklistRequestInspector.js");

describe("blockMiddleware", () => {
	it("creates BlacklistRequestInspector with correct dependencies", () => {
		const mockUserAccessRulesStorage = {
			get: vi.fn(),
			set: vi.fn(),
		};
		const mockDb = {
			getUserAccessRulesStorage: vi
				.fn()
				.mockReturnValue(mockUserAccessRulesStorage),
		};
		const mockIsReady = vi.fn();
		const mockEnv = {
			getDb: vi.fn().mockReturnValue(mockDb),
			isReady: mockIsReady,
		} as unknown as ProviderEnvironment;

		const mockAbortRequestForBlockedUsers = vi.fn();
		const mockBlacklistRequestInspector = {
			abortRequestForBlockedUsers: mockAbortRequestForBlockedUsers,
		};
		vi.mocked(BlacklistRequestInspector).mockReturnValue(
			// biome-ignore lint/suspicious/noExplicitAny: tests
			mockBlacklistRequestInspector as any,
		);

		const middleware = blockMiddleware(mockEnv);

		// The second argument should be the bound isReady function
		expect(BlacklistRequestInspector).toHaveBeenCalledWith(
			mockUserAccessRulesStorage,
			expect.any(Function), // bound isReady function
		);
		expect(typeof middleware).toBe("function");
	});

	it("returns bound abortRequestForBlockedUsers method", () => {
		const mockUserAccessRulesStorage = {
			get: vi.fn(),
			set: vi.fn(),
		};
		const mockDb = {
			getUserAccessRulesStorage: vi
				.fn()
				.mockReturnValue(mockUserAccessRulesStorage),
		};
		const mockIsReady = vi.fn();
		const mockEnv = {
			getDb: vi.fn().mockReturnValue(mockDb),
			isReady: mockIsReady,
		} as unknown as ProviderEnvironment;

		const mockAbortRequestForBlockedUsers = vi.fn();
		const mockBlacklistRequestInspector = {
			abortRequestForBlockedUsers: mockAbortRequestForBlockedUsers,
		};
		vi.mocked(BlacklistRequestInspector).mockReturnValue(
			// biome-ignore lint/suspicious/noExplicitAny: tests
			mockBlacklistRequestInspector as any,
		);

		const middleware = blockMiddleware(mockEnv);

		expect(typeof middleware).toBe("function");
		// The middleware returns a bound function, not the original method
		expect(middleware).not.toBe(mockAbortRequestForBlockedUsers);
	});
});
