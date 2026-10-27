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

import * as fs from "node:fs";
import * as path from "node:path";
import { ViteFrontendConfig, VitePluginCopy } from "@prosopo/config";
import { loadEnv } from "@prosopo/dotenv";
import { type Plugin, type UserConfig, defineConfig } from "vite";

// IIFE / classic-script build of the procaptcha bundle.
// Used as a `<script nomodule>` fallback so crawlers and runtimes that do not
// execute `type="module"` scripts (notably Ahrefs' renderer) still mount the
// widget and expose the outbound link in the rendered DOM.

loadEnv();
process.env.TS_NODE_PROJECT = path.resolve("./tsconfig.json");

const bundleName = "procaptcha";
const packageName = "@prosopo/procaptcha-bundle";
const entry = "./src/index.ts";
const tsConfigPaths = [path.resolve("./tsconfig.json")];
const packagesDir = path.resolve("..");
const workspaceRoot = path.resolve("../../");
const packages = fs
	.readdirSync(packagesDir)
	.filter((f) => fs.statSync(path.join(packagesDir, f)).isDirectory());
for (const p of packages) {
	tsConfigPaths.push(path.resolve(`../${p}/tsconfig.json`));
}

const copyDir = {
	srcDir: `${workspaceRoot}/packages/locale/src/locales`,
	destDir: `${workspaceRoot}/packages/procaptcha-bundle/dist/bundle/locales`,
};

// The frontend config leaves these server-only modules external. An ES module
// build drops an external import nobody calls, but an IIFE passes every
// external into its wrapper as a global variable, so the browser threw
// "i18next_http_middleware is not defined" before the widget ran a line. Here
// they resolve to stubs with the same exports, which fail loudly only if
// called.
const SERVER_ONLY_STUBS: Record<string, string> = {
	"i18next-http-middleware":
		"export const handle = () => { unavailable(); }; export class LanguageDetector { constructor() { unavailable(); } }",
	"i18next-fs-backend/cjs":
		"export default class FsBackend { constructor() { unavailable(); } }",
	"node:path":
		"const path = new Proxy({}, { get: () => () => unavailable() }); export const join = () => unavailable(); export default path;",
	"node:url":
		"export const fileURLToPath = () => unavailable(); export const pathToFileURL = () => unavailable();",
};
const STUB_PREFIX = "\0server-only-stub:";

const serverOnlyStubs = (): Plugin => ({
	name: "prosopo-server-only-stubs",
	enforce: "pre",
	resolveId: (id) => (id in SERVER_ONLY_STUBS ? STUB_PREFIX + id : null),
	load: (id) => {
		if (!id.startsWith(STUB_PREFIX)) return null;
		const name = id.slice(STUB_PREFIX.length);
		return `const unavailable = () => { throw new Error(${JSON.stringify(`${name} is server-only and not available in the browser`)}); };\n${SERVER_ONLY_STUBS[name]}`;
	},
});

const isServerOnly = (id: string): boolean => id in SERVER_ONLY_STUBS;

type External = NonNullable<
	NonNullable<UserConfig["build"]>["rollupOptions"]
>["external"];

const withoutServerOnly = (external: External): External => {
	if (external === undefined) return undefined;
	if (typeof external === "function") {
		return (id, importer, isResolved) =>
			!isServerOnly(id) && external(id, importer, isResolved);
	}
	const entries = Array.isArray(external) ? external : [external];
	return entries.filter(
		(entry) => typeof entry !== "string" || !isServerOnly(entry),
	);
};

export default defineConfig(async ({ command, mode }) => {
	// Test-only escape hatch for the firefox cypress leg: cypress can only
	// dispatch trusted input over the chrome devtools protocol (chromium
	// only), so on firefox the specs click synthetically and the widget's
	// isEventTrusted() gate would drop every one. Anything other than an
	// explicit "1" on a non-production build compiles the allowance out.
	const allowUntrustedEvents =
		mode !== "production" && process.env.PROSOPO_ALLOW_UNTRUSTED_EVENTS === "1";

	const frontendConfig = await ViteFrontendConfig(
		packageName,
		bundleName,
		path.resolve(),
		entry,
		command,
		mode,
		undefined,
		tsConfigPaths,
		workspaceRoot,
	);

	return {
		...frontendConfig,
		define: {
			...frontendConfig.define,
			__PROSOPO_ALLOW_UNTRUSTED_EVENTS__: JSON.stringify(allowUntrustedEvents),
		},
		worker: {
			format: "es",
		},
		build: {
			...frontendConfig.build,
			assetsDir: "",
			emptyOutDir: false,
			lib: {
				...frontendConfig.build?.lib,
				entry: path.resolve(entry),
				name: bundleName,
				fileName: () => "procaptcha.bundle.iife.js",
				formats: ["iife"],
			},
			rollupOptions: {
				...frontendConfig.build?.rollupOptions,
				external: withoutServerOnly(
					frontendConfig.build?.rollupOptions?.external,
				),
				output: {
					...frontendConfig.build?.rollupOptions?.output,
					entryFileNames: "procaptcha.bundle.iife.js",
					inlineDynamicImports: true,
					manualChunks: undefined,
				},
			},
		},
		plugins: [
			serverOnlyStubs(),
			// Only the widget namespace: the browser renders nothing else, and
			// the provider translates image labels itself. Copied whole: the
			// provider sends any of these keys with an error for the widget to
			// show, so stripping keys the bundle never names would leave those
			// errors untranslated.
			VitePluginCopy({
				srcDir: copyDir.srcDir,
				destDir: copyDir.destDir,
				include: ["*/widget.json"],
			}),
			...(frontendConfig.plugins ? frontendConfig.plugins : []),
		],
	};
});
