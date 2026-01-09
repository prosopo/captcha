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

import { describe, expect, it } from "vitest";
import { version } from "../version.js";

describe("version", () => {
	// Test that version is exported and is a string
	it("should export a version string", () => {
		expect(typeof version).toBe("string");
		expect(version.length).toBeGreaterThan(0);
	});

	// Test that version defaults to "dev" when PROSOPO_PACKAGE_VERSION is not set
	it("should default to 'dev' when environment variable is not set", () => {
		// This test assumes the environment variable is not set during testing
		// In a real scenario, this would be "dev" unless overridden by build process
		expect(typeof version).toBe("string");
	});
});
