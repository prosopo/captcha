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

import type { UserConfig } from "vite";
import type { PluginOptions as DtsPluginOptions } from "vite-plugin-dts";
import { assertType, describe, expectTypeOf, test } from "vitest";
import {
	ENV_DIR_RELATIVE_PATH,
	type IntegrationConfigSettings,
	buildFileName,
	createIntegrationViteConfig,
} from "../index.js";

describe("IntegrationConfigSettings", () => {
	test("is exported, so a consumer can type its own settings", () => {
		// It used to be internal, which left every vite.config.ts writing an
		// untyped object literal and finding its mistakes at build time.
		assertType<IntegrationConfigSettings>({
			directory: "/repo/integration/frameworks/react/wrapper",
			name: "Wrapper",
		});
	});

	test("the directory and the name are required", () => {
		// @ts-expect-error there is nothing sensible to default the directory to
		assertType<IntegrationConfigSettings>({ name: "Wrapper" });
		// @ts-expect-error the library needs a global name
		assertType<IntegrationConfigSettings>({ directory: "/repo/x" });
	});

	test("the vite settings and the dts options are optional", () => {
		expectTypeOf<IntegrationConfigSettings["viteSettings"]>().toEqualTypeOf<
			UserConfig | undefined
		>();
		expectTypeOf<IntegrationConfigSettings["dtsPluginOptions"]>().toEqualTypeOf<
			DtsPluginOptions | undefined
		>();
	});

	test("the caller's settings are a whole vite config, not a subset", () => {
		// Anything narrower would mean this package had to grow a passthrough for
		// each vite option a consumer needed.
		assertType<IntegrationConfigSettings>({
			directory: "/repo/x",
			name: "X",
			viteSettings: {
				plugins: [],
				build: { rollupOptions: { external: ["react"] } },
				resolve: { alias: {} },
				server: { port: 3000 },
			},
		});
	});

	test("has exactly the four settings it documents", () => {
		expectTypeOf<keyof IntegrationConfigSettings>().toEqualTypeOf<
			"directory" | "name" | "viteSettings" | "dtsPluginOptions"
		>();
	});

	test("the directory and name are strings, not paths or symbols", () => {
		expectTypeOf<
			IntegrationConfigSettings["directory"]
		>().toEqualTypeOf<string>();
		expectTypeOf<IntegrationConfigSettings["name"]>().toEqualTypeOf<string>();
	});
});

describe("createIntegrationViteConfig", () => {
	test("returns a vite config that can be exported straight from vite.config.ts", () => {
		expectTypeOf(
			createIntegrationViteConfig,
		).returns.toEqualTypeOf<UserConfig>();
		assertType<UserConfig>(
			createIntegrationViteConfig({ directory: "/repo/x", name: "X" }),
		);
	});

	test("takes exactly one argument, so nothing is configured positionally", () => {
		expectTypeOf(createIntegrationViteConfig).parameters.toEqualTypeOf<
			[IntegrationConfigSettings]
		>();
	});

	test("rejects settings it does not understand", () => {
		assertType<UserConfig>(
			createIntegrationViteConfig({
				directory: "/repo/x",
				name: "X",
				// @ts-expect-error a misspelt setting must not be silently ignored
				vitesettings: {},
			}),
		);
	});
});

describe("buildFileName", () => {
	test("maps a format name to a file name", () => {
		expectTypeOf(buildFileName).toEqualTypeOf<(format: string) => string>();
	});

	test("is usable as vite's lib.fileName", () => {
		// vite calls it with the format and an entry name; a signature that
		// insisted on both would not fit.
		const config: UserConfig = {
			build: { lib: { entry: "src/index.ts", fileName: buildFileName } },
		};
		assertType<UserConfig>(config);
	});
});

describe("ENV_DIR_RELATIVE_PATH", () => {
	test("is a fixed relative path, so it cannot be reassigned per package", () => {
		expectTypeOf(ENV_DIR_RELATIVE_PATH).toEqualTypeOf<"../..">();
	});
});
