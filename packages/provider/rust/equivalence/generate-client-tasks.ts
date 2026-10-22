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

// Writes client-tasks-vectors.json: matchesGlob, and domainPatternMatcher over every pairing of
// a spread of origins and site domain patterns. Run on Node 24.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { getLogger } from "@prosopo/logger";
import type { IProviderDatabase } from "@prosopo/types-database";
import getConfig from "../../../cli/src/prosopo.config.js";
import { ClientTaskManager, matchesGlob } from "../../src/tasks/client/clientTasks.js";

if (!process.version.startsWith("v24.")) {
	throw new Error(`this generator must run on Node 24 (the production runtime), not ${process.version}`);
}

Object.assign(process.env, { CADDY_DOMAIN: "h", PROSOPO_IPAPI_KEY: "k", PROSOPO_IPAPI_URL: "https://x" });
const manager = new ClientTaskManager(getConfig(), getLogger("fatal", "equivalence"), {} as unknown as IProviderDatabase);

const globs: [string, string][] = [];
const patterns = ["*", "**", "a*", "*a", "a*b", "a*b*c", "*.*", "app-*.example.net", "x", "", "é*", "*é", "a**b", "*ab*", "?"];
const texts = ["", "a", "ab", "abc", "aXbYc", "app-1.example.net", "app.example.net", "é", "aé", "ba", "x", "?", "a.b"];
for (const pattern of patterns) for (const text of texts) globs.push([pattern, text]);

const referrers = [
	"https://example.com",
	"https://Example.COM:8443/path?q=1",
	"http://www.example.com",
	"https://sub.example.com",
	"https://a.b.example.com.",
	"https://notexample.com",
	"example.com",
	"www.example.com",
	"https://localhost:3000",
	"localhost",
	"http://127.0.0.1",
	"https://[::1]:443",
	"https://user@example.com",
	"null",
	"",
	"https://xn--bcher-kva.example",
	"https://bücher.example",
	"https://app-1.example.net",
	"https://APP-X.example.net",
	"https://example.org.evil.com",
	"https://example-com.translate.goog",
	"https://exa mple.com",
	"https:///",
];
const domains = [
	"*",
	" * ",
	"localhost",
	"  LOCALHOST ",
	"example.com",
	"EXAMPLE.COM",
	"www.example.com",
	"https://example.com",
	"example.com/path",
	"example.com.",
	"*.example.com",
	"*.EXAMPLE.com",
	"*.",
	"app-*.example.net",
	"APP-*.EXAMPLE.NET",
	"*example*",
	"bücher.example",
	"xn--bcher-kva.example",
	"[::1]",
	"127.0.0.1",
	"",
	"a@b",
	"*.a@b",
	"exa mple.com",
];
const matches: [string, string, boolean][] = [];
for (const referrer of referrers) for (const domain of domains) matches.push([referrer, domain, manager.domainPatternMatcher(referrer, domain)]);

writeFileSync(
	fileURLToPath(new URL("./client-tasks-vectors.json", import.meta.url)),
	`${JSON.stringify({ globs: globs.map(([pattern, text]) => [pattern, text, matchesGlob(pattern, text)]), matches })}\n`,
);
console.log(`wrote client-tasks-vectors.json (${globs.length} globs, ${matches.length} matches)`);
process.exit(0);
