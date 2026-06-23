import fs from "node:fs";
import path from "node:path";
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
import dotenv from "dotenv";
import { mergeConfig } from "vitest/config";
process.env.NODE_ENV = "test";
// if .env.test exists at this level, use it, otherwise use the one at the root
const envFile = `.env.${process.env.NODE_ENV || "development"}`;
let envPath = envFile;
if (fs.existsSync(envFile)) {
	envPath = path.resolve(envFile);
} else if (fs.existsSync(`../../${envFile}`)) {
	envPath = path.resolve(`../../${envFile}`);
} else {
	throw new Error(`No ${envFile} file found`);
}

dotenv.config({ path: envPath });

// All integration tests in this package share one redis-stack instance
// at localhost:6379, and they both write to the global access-rules
// index. With vitest's default parallel file execution, the suites
// trample each other's data (row counts diverge, indexes get dropped
// mid-query). Force serial file execution so test isolation matches
// the redis isolation the suites already rely on.
export default mergeConfig(ViteTestConfig(), {
	test: {
		fileParallelism: false,
	},
});
