// Copyright 2021-2025 Prosopo (UK) Ltd.
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

import { at } from "@prosopo/util";

const arg = at(process.argv.slice(2), 0).trim();
console.log(`arg          : ${arg}`);

const byteArray = arg.split(",").map((x) => Number.parseInt(x));

const hex = Array.from(byteArray, (byte) =>
	`0${(byte & 0xff).toString(16)}`.slice(-2),
).join("");

console.log(hex);
