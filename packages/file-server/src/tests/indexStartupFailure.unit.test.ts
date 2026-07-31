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

import type http from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";

// Kept in its own file: the failing main() below is a module-level mock, and
// sharing a module registry with the happy-path entrypoint test would let it
// apply there too, depending on the order vitest picks.
const startupError = new Error("listen failed");

vi.mock("@prosopo/util", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@prosopo/util")>();
	return { ...actual, isMain: (): boolean => true };
});

vi.mock("../fileServer.js", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../fileServer.js")>();
	return {
		...actual,
		main: async (): Promise<http.Server> => {
			throw startupError;
		},
	};
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("index entrypoint startup failure", () => {
	it("logs rather than throwing when the server fails to start", async () => {
		const errorLog = vi
			.spyOn(console, "error")
			.mockImplementation((): void => {});

		// An unhandled rejection here would take the process down at startup.
		await expect(import("../index.js")).resolves.toBeDefined();

		await vi.waitFor(() => {
			expect(errorLog).toHaveBeenCalledWith(startupError);
		});
	});
});
