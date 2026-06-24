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
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prosopoRouter } from "../../../api/captcha.js";
import {
	createMockExpressObjects,
	createMockProviderEnvironment,
} from "../testUtils/mockProviderEnv.js";

describe("prosopoRouter", () => {
	let mockEnv: ReturnType<typeof createMockProviderEnvironment>;
	// biome-ignore lint/suspicious/noExplicitAny: tests
	let mockReq: any;
	// biome-ignore lint/suspicious/noExplicitAny: tests
	let mockRes: any;
	// biome-ignore lint/suspicious/noExplicitAny: tests
	let mockNext: any;

	beforeEach(() => {
		vi.clearAllMocks();
		mockEnv = createMockProviderEnvironment();
		const expressObjects = createMockExpressObjects();
		mockReq = expressObjects.mockReq;
		mockRes = expressObjects.mockRes;
		mockNext = expressObjects.mockNext;
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Router Creation", () => {
		it("should create an express router", () => {
			const router = prosopoRouter(mockEnv);
			expect(router).toBeDefined();
			expect(typeof router.post).toBe("function");
			expect(typeof router.get).toBe("function");
		});

		it("should initialize user access rules storage", () => {
			prosopoRouter(mockEnv);
			expect(mockEnv.db?.getUserAccessRulesStorage).toHaveBeenCalled();
		});

		it("should create router with captcha routes", () => {
			const router = prosopoRouter(mockEnv);
			expect(router).toBeDefined();

			// Check that the router has the expected structure
			// (The routes are registered internally, so we can't easily spy on them)
			expect(router.stack).toBeDefined();
			expect(Array.isArray(router.stack)).toBe(true);
		});
	});
});
