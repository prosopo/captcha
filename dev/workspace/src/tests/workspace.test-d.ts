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

import { assertType, describe, expectTypeOf, test } from "vitest";
// Deliberately the package entrypoint rather than the module: consumers import
// `@prosopo/workspace`, so that is the surface worth pinning.
import {
	WORKSPACE_ROOT_MAX_DEPTH,
	type WorkspaceRootDeps,
	findWorkspaceRoot,
	getCacheDir,
	getLocalePkgDir,
	getPackagesDir,
	getRootDir,
	getTestResultsDir,
} from "../index.js";

describe("directory getters", () => {
	test("take no arguments and return a string", () => {
		expectTypeOf(getRootDir).toEqualTypeOf<() => string>();
		expectTypeOf(getRootDir()).toEqualTypeOf<string>();
		expectTypeOf(getPackagesDir()).toEqualTypeOf<string>();
		expectTypeOf(getLocalePkgDir()).toEqualTypeOf<string>();
		expectTypeOf(getCacheDir()).toEqualTypeOf<string>();
		expectTypeOf(getTestResultsDir()).toEqualTypeOf<string>();
	});

	test("reject arguments — a path is never parameterised", () => {
		// @ts-expect-error getRootDir takes no arguments
		getRootDir("somewhere");
	});

	test("are not widened to `any`, so string operations stay checked", () => {
		expectTypeOf(getRootDir()).not.toBeAny();
		expectTypeOf(getRootDir().split("/")).toEqualTypeOf<string[]>();
	});
});

describe("removed getters", () => {
	test("getClientExampleDir and getDappExampleDir are gone from the surface", async () => {
		const entrypoint = await import("../index.js");
		// @ts-expect-error removed: demos/client-example no longer exists
		expectTypeOf(entrypoint.getClientExampleDir).toBeUndefined();
		// @ts-expect-error removed: demos/dapp-example no longer exists
		expectTypeOf(entrypoint.getDappExampleDir).toBeUndefined();
	});
});

describe("findWorkspaceRoot", () => {
	test("returns a string", () => {
		expectTypeOf(findWorkspaceRoot()).toEqualTypeOf<string>();
	});

	test("both parameters are optional, preserving the original call shape", () => {
		assertType<string>(findWorkspaceRoot());
		assertType<string>(findWorkspaceRoot("@acme/pkg"));
		expectTypeOf(findWorkspaceRoot)
			.parameter(0)
			.toEqualTypeOf<string | undefined>();
	});

	test("rejects a non-string name", () => {
		// @ts-expect-error name is a string
		findWorkspaceRoot(42);
	});

	test("accepts a full dependency set as the second parameter", () => {
		const deps: WorkspaceRootDeps = {
			cwd: () => "/tmp",
			existsSync: () => false,
			readFileSync: () => "{}",
			warn: () => undefined,
		};
		assertType<string>(findWorkspaceRoot(undefined, deps));
	});

	test("rejects a partial dependency set — every seam must be supplied", () => {
		// A partial object would silently fall through to the real filesystem
		// for whatever it omitted, which is exactly what the seam exists to
		// prevent.
		// @ts-expect-error missing readFileSync and warn
		findWorkspaceRoot(undefined, {
			cwd: () => "/tmp",
			existsSync: () => false,
		});
	});
});

describe("WorkspaceRootDeps", () => {
	test("pins each seam's signature", () => {
		expectTypeOf<WorkspaceRootDeps["cwd"]>().toEqualTypeOf<() => string>();
		expectTypeOf<WorkspaceRootDeps["existsSync"]>().toEqualTypeOf<
			(target: string) => boolean
		>();
		expectTypeOf<WorkspaceRootDeps["warn"]>().toEqualTypeOf<
			(message: string) => void
		>();
	});

	test("readFileSync returns a string, not a Buffer", () => {
		// The default implementation pins the "utf8" encoding, so callers never
		// have to deal with a Buffer overload.
		expectTypeOf<WorkspaceRootDeps["readFileSync"]>().toEqualTypeOf<
			(target: string) => string
		>();
	});
});

describe("WORKSPACE_ROOT_MAX_DEPTH", () => {
	test("is a number", () => {
		expectTypeOf(WORKSPACE_ROOT_MAX_DEPTH).toEqualTypeOf<number>();
	});
});
