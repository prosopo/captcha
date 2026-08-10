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
process.env.NODE_ENV = "test";
// Prefer a .env.test at this level, fall back to the repo root. Neither is
// committed and these tests need nothing from one, so a missing file leaves the
// ambient environment alone rather than failing the run: throwing here would
// mean nobody could run the suite without first creating an empty file.
const envFile = `.env.${process.env.NODE_ENV || "development"}`;
const envPath = [envFile, `../../${envFile}`].find((candidate) =>
	fs.existsSync(candidate),
);

if (envPath !== undefined) {
	dotenv.config({ path: path.resolve(envPath) });
}

export default ViteTestConfig();
