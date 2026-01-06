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

import { describe, expect, it, vi } from "vitest";
import { ExtensionLoader } from "../extensionLoader.js";

// Mock the imports
vi.mock("@prosopo/account/extension/ExtensionWeb2", () => ({
	default: { name: "ExtensionWeb2" },
}));

vi.mock("@prosopo/account/extension/ExtensionWeb3", () => ({
	default: { name: "ExtensionWeb3" },
}));

describe("extensionLoader", () => {
	describe("ExtensionLoader", () => {
		it("should load ExtensionWeb2 when web2 is true", async () => {
			const result = await ExtensionLoader(true);

			expect(result).toEqual({ name: "ExtensionWeb2" });
		});

		it("should load ExtensionWeb3 when web2 is false", async () => {
			const result = await ExtensionLoader(false);

			expect(result).toEqual({ name: "ExtensionWeb3" });
		});
	});
});
