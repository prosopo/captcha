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

import { fileURLToPath } from "node:url";
import { ViteTestConfig } from "@prosopo/config";
process.env.NODE_ENV = "test";

const config = ViteTestConfig();

// Pre-download the mongod binary once, in the parent process, before the test
// forks spawn. Avoids the flaky concurrent-download lockfile race in
// mongodb-memory-server. See ./src/tests/mongoGlobalSetup.ts.
config.test = config.test || {};
config.test.globalSetup = [
	fileURLToPath(new URL("./src/tests/mongoGlobalSetup.ts", import.meta.url)),
];

export default config;
