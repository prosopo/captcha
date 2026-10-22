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

// Writes cron-vectors.json: the `cron` package's CronTime (3.1.7, the schedulers' clock), in
// UTC, over a spread of expressions: what each parses to (or the error it throws) and the next
// firing times from a spread of starting instants. Run on Node 24.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { CronTime } from "cron";

if (!process.version.startsWith("v24.")) {
	throw new Error(`this generator must run on Node 24 (the production runtime), not ${process.version}`);
}

const expressions = [
	"* * * * *",
	"*/5 * * * *",
	"0 * * * *",
	"0 0 * * *",
	"30 2 * * *",
	"0 */6 * * *",
	"15,45 * * * *",
	"0 9-17 * * 1-5",
	"0 0 1 * *",
	"0 0 31 * *",
	"0 0 30 2 *",
	"0 0 29 2 *",
	"0 12 * * 0",
	"0 12 * * 7",
	"0 12 * * sun",
	"0 0 13 * fri",
	"0 0 1,15 * mon",
	"*/10 * * * * *",
	"30 */2 * * * *",
	"0 0 0 1 jan *",
	"0 0 0 * dec-feb mon",
	"5-10/2 * * * *",
	"0 0-23/7 * * *",
	"@hourly",
	"@daily",
	"@weekly",
	"@monthly",
	"@yearly",
	"@weekdays",
	"@weekends",
	"@minutely",
	"0 0 * * 1-5/2",
	"59 23 31 12 *",
	"0 0 * 2 *",
	"*/7 * * * *",
	"0 0 * * 0-5",
	"5/15 * * * *",
	"0 0 1-30 * *",
	"0 0 2/3 * mon",
	"0 0 10-5 * *",
	"0 0 * * 8",
	"0 */0 * * *",
	"60 * * * *",
	"* * * *",
	"* * * * * * *",
	"0 0 * * foo",
	"1* * * * *",
	"",
];
const starts = [
	"2026-01-01T00:00:00.000Z",
	"2026-01-31T23:59:59.999Z",
	"2026-02-28T12:34:56.789Z",
	"2026-03-29T00:59:30.000Z",
	"2026-06-15T23:00:00.000Z",
	"2026-10-22T04:17:42.500Z",
	"2026-12-31T23:59:00.000Z",
	"2028-02-28T23:59:59.000Z",
];

const generatedAt = new Date().toISOString();
const cases = expressions.map((expression) => {
	try {
		const time = new CronTime(expression, "UTC");
		const runs = starts.map((start) => {
			let date: Date = new Date(start);
			const next: string[] = [];
			for (let i = 0; i < 6; i++) {
				date = new Date(time.getNextDateFrom(date, "UTC").toMillis());
				next.push(date.toISOString());
			}
			return { start, next };
		});
		return { expression, parsed: time.toString(), runs };
	} catch (error) {
		return { expression, error: (error as Error).message };
	}
});

writeFileSync(fileURLToPath(new URL("./cron-vectors.json", import.meta.url)), `${JSON.stringify({ generatedAt, cases })}\n`);
console.log(`wrote cron-vectors.json (${cases.length} expressions)`);
