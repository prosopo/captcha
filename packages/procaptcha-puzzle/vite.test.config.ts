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
import { ViteTestConfig } from "@prosopo/config";
import { defineConfig, mergeConfig } from "vitest/config";

process.env.NODE_ENV = "test";

// The widgets render into the DOM and the manager clears its timeouts through
// `window`, so jsdom is required; the setup file tells React it is under test
// so act() flushes renders synchronously.
export default mergeConfig(
	ViteTestConfig(),
	defineConfig({
		test: { environment: "jsdom", setupFiles: ["./src/tests/setup.ts"] },
	}),
);
