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
import type { Plugin } from "vite";

// js-confuser's `deadCode` transform injects a fixed set of fake `require()`
// specifiers into obfuscated sources as unreachable dead code. Rollup (Vite 6)
// left unresolved imports external with a warning, so these harmless specifiers
// never broke the build. Rolldown (Vite 8) treats an unresolved import as a hard
// error, so we restore the old behaviour by marking exactly these known
// dead-code specifiers as external. They are never executed at runtime.
const OBFUSCATOR_DEADCODE_SPECIFIERS: ReadonlySet<string> = new Set([
	"../../package",
	"../redacted.js",
	"../utils/isStandaloneExecutable",
	"./resolve-local-redacted-path",
	"@redacted/components/package",
	"@redacted/enterprise-plugin",
	"@redacted/enterprise-plugin/package",
]);

export default function VitePluginExternalizeObfuscatorDeadCode(): Plugin {
	return {
		name: "externalize-obfuscator-deadcode",
		enforce: "pre",
		resolveId(source: string) {
			if (OBFUSCATOR_DEADCODE_SPECIFIERS.has(source)) {
				return { id: source, external: true };
			}
			return null;
		},
	};
}
