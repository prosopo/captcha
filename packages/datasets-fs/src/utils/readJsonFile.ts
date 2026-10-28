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

import fs from "node:fs";
import { parseJson } from "@prosopo/util";

/**
 * Read and parse a JSON file, naming the file if it is not valid JSON —
 * JSON.parse's SyntaxError alone does not say which input was bad.
 * Integers past 2^53 round as JSON.parse would: the dataset schemas expect
 * numbers, not bigints.
 */
export const readJsonFile = (file: string): unknown =>
	parseJson(fs.readFileSync(file, "utf8"), { bigints: "number" }).expect(
		`JSON in ${file}`,
	);
