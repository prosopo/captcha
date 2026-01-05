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

import type { ProviderEnvironment } from "@prosopo/types-env";
import { describe, expect, it, vi } from "vitest";
import { blockMiddleware } from "../../../api/block.js";
import { BlacklistRequestInspector } from "../../../api/blacklistRequestInspector.js";

vi.mock("../../../api/blacklistRequestInspector.js", () => ({
	BlacklistRequestInspector: vi.fn(),
}));

describe("blockMiddleware", () => {
	it("creates BlacklistRequestInspector with correct dependencies", () => {
		const mockUserAccessRulesStorage = {
			get: vi.fn(),
			set: vi.fn(),
		};
		const mockDb = {
			getUserAccessRulesStorage: vi.fn().mockReturnValue(mockUserAccessRulesStorage),
		};
		const mockIsReady = vi.fn();
		const mockEnv = {
			getDb: vi.fn().mockReturnValue(mockDb),
			isReady: mockIsReady,
		} as unknown as ProviderEnvironment;

		const mockAbortRequestForBlockedUsers = vi.fn();
		vi.mocked(BlacklistRequestInspector).mockImplementation(() => ({
			abortRequestForBlockedUsers: mockAbortRequestForBlockedUsers,
		})) as unknown as typeof BlacklistRequestInspector;

		const middleware = blockMiddleware(mockEnv);

		expect(BlacklistRequestInspector).toHaveBeenCalledWith(
			mockUserAccessRulesStorage,
			mockIsReady,
		);
		expect(middleware).toBe(mockAbortRequestForBlockedUsers);
	});

	it("returns bound abortRequestForBlockedUsers method", () => {
		const mockUserAccessRulesStorage = {
			get: vi.fn(),
			set: vi.fn(),
		};
		const mockDb = {
			getUserAccessRulesStorage: vi.fn().mockReturnValue(mockUserAccessRulesStorage),
		};
		const mockIsReady = vi.fn();
		const mockEnv = {
			getDb: vi.fn().mockReturnValue(mockDb),
			isReady: mockIsReady,
		} as unknown as ProviderEnvironment;

		const mockAbortRequestForBlockedUsers = vi.fn();
		vi.mocked(BlacklistRequestInspector).mockImplementation(() => ({
			abortRequestForBlockedUsers: mockAbortRequestForBlockedUsers,
		})) as unknown as typeof BlacklistRequestInspector;

		const middleware = blockMiddleware(mockEnv);

		expect(typeof middleware).toBe("function");
		expect(middleware).toBe(mockAbortRequestForBlockedUsers);
	});
});

