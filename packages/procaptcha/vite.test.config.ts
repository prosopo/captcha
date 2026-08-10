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

// jsdom: the manager clears its challenge timeout through `window`, and the
// collector attaches listeners to real form elements.
export default mergeConfig(
	ViteTestConfig(),
	defineConfig({ test: { environment: "jsdom" } }),
);
