// Copyright 2021-2024 Prosopo (UK) Ltd.
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

import fs from "node:fs";
import path from "node:path";
import { ViteTestConfig } from "@prosopo/config";
import dotenv from "dotenv";

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

export default ViteTestConfig;
