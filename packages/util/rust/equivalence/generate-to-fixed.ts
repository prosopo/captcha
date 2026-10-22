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

// Writes to-fixed.json: `Number.prototype.toFixed` over the edge cases (exact ties, values
// that only look like ties, signed zero, the 1e21 switch to exponent form) and seeded random
// numbers across magnitudes. Run on Node 24.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const named = (x: number): number | string =>
	Number.isNaN(x) ? "NaN" : x === Number.POSITIVE_INFINITY ? "Infinity" : x === Number.NEGATIVE_INFINITY ? "-Infinity" : Object.is(x, -0) ? "-0" : x;
const edges: number[] = [
	0, -0, 0.125, 1.005, 2.5, -2.5, 0.5, -0.5, 1.45, 1.55, 123.456, -0.0001, 9.995, 99.995, 0.999, 1e20, 1e21, 1.23e-10, Number.NaN,
	Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 1234.5678, 0.045, 5e-324, 12345678901234567890, -1e-7, 0.00499999, 1.9999999999999998,
];
const cases: [number | string, number, string][] = [];
for (const x of edges) for (const digits of [0, 1, 2, 4, 10]) cases.push([named(x), digits, x.toFixed(digits)]);
let seed = 7;
const random = (): number => {
	seed = (seed * 1103515245 + 12345) % 2147483648;
	return seed / 2147483648;
};
for (let i = 0; i < 3000; i++) {
	const x = (random() - 0.5) * 10 ** (Math.floor(random() * 12) - 4);
	const digits = Math.floor(random() * 8);
	cases.push([named(x), digits, x.toFixed(digits)]);
}
writeFileSync(fileURLToPath(new URL("./to-fixed.json", import.meta.url)), `${JSON.stringify(cases)}\n`);
console.log(`wrote to-fixed.json (${cases.length} cases)`);
