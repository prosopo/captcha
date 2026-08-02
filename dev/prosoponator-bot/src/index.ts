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

export * from "./bot.js";
export * from "./isMain.js";

import { main } from "./bot.js";
import { isMain } from "./isMain.js";

// The bot used to run on import: bot.ts called run() at module scope and
// index.ts only logged its own name. Importing the package now has no effect.
if (isMain(import.meta.url)) {
	// Not awaited: a top-level await cannot be emitted in the cjs build, and
	// main() reports its own failures through core.setFailed rather than
	// rejecting.
	void main();
}
