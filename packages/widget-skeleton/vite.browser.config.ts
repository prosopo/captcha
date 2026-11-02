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

import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

process.env.NODE_ENV = "test";

// The widget's size comes out of CSS intrinsic sizing, container queries and
// flex wrapping — none of which jsdom implements, so the suites that assert
// what the widget actually measures have to run against a real engine. Kept
// separate from vite.test.config.ts so the jsdom run stays dependency-free and
// fast; `TEST_TYPE=unit` on the `test` script keeps these files out of it.
export default defineConfig({
	test: {
		include: ["src/**/*.browser.test.ts"],
		browser: {
			enabled: true,
			provider: playwright(),
			headless: true,
			screenshotFailures: false,
			instances: [{ browser: "chromium" }],
		},
	},
});
