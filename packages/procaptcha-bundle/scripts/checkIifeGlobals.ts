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

// Fails the IIFE build if its wrapper is handed any global besides its own
// exports object. Every external module becomes such a global, and no page
// defines them, so the bundle throws on load before the widget renders. That
// shipped once ("i18next_http_middleware is not defined") without any test
// noticing, because nothing else loads the IIFE.

import { readFileSync } from "node:fs";

const bundlePath = new URL(
	"../dist/bundle/procaptcha.bundle.iife.js",
	import.meta.url,
);
const source: string = readFileSync(bundlePath, "utf8").trimEnd();
const wrapperArgs: string | undefined = /\}\)\(([^()]*)\);?$/.exec(source)?.[1];

if (wrapperArgs === undefined) {
	console.error(
		`Could not find the IIFE wrapper call at the end of ${bundlePath.pathname}`,
	);
	process.exit(1);
}

const globals: string[] = wrapperArgs
	.split(",")
	.map((arg: string) => arg.trim())
	.filter((arg: string) => arg !== "" && arg !== "{}");

if (globals.length > 0) {
	console.error(
		`The IIFE bundle reads globals no page defines, so it would throw on load: ${globals.join(", ")}. Stub these modules in vite.iife.config.ts.`,
	);
	process.exit(1);
}

console.log("IIFE bundle takes no external globals");
