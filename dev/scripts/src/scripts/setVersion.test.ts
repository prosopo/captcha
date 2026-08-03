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
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parse } from "@iarna/toml";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// `setVersion` rewrites every manifest under the repo root, so the root is
// pinned to a throwaway directory for the duration of each test.
let root = "";
vi.mock("@prosopo/workspace", () => ({
	getRootDir: (): string => root,
}));

const { default: setVersion } = await import("./setVersion.js");

const write = (relative: string, contents: string): void => {
	const full = path.join(root, relative);
	fs.mkdirSync(path.dirname(full), { recursive: true });
	fs.writeFileSync(full, contents);
};

const readJson = (relative: string): Record<string, unknown> =>
	JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));

const readToml = (relative: string): Record<string, unknown> =>
	parse(fs.readFileSync(path.join(root, relative), "utf8"));

const read = (relative: string): string =>
	fs.readFileSync(path.join(root, relative), "utf8");

beforeEach(() => {
	root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "setVersion-")));
});

afterEach(() => {
	fs.rmSync(root, { recursive: true, force: true });
});

describe("version parsing", () => {
	it.each(["1", "1.2", "1.2.3.4", "", "a.b.c", "1.x.3", "1..3"])(
		"rejects %o",
		async (version: string) => {
			await expect(setVersion(version)).rejects.toThrow(
				"Version must be in the format of x.y.z",
			);
		},
	);

	it("accepts a plain semver version", async () => {
		write("package.json", JSON.stringify({ version: "0.0.1" }));
		await setVersion("1.2.3");
		expect(readJson("package.json").version).toBe("1.2.3");
	});

	it("normalises numeric parts, dropping leading zeroes", async () => {
		write("package.json", JSON.stringify({ version: "0.0.1" }));
		await setVersion("01.002.0003");
		expect(readJson("package.json").version).toBe("1.2.3");
	});

	it("tolerates a trailing suffix on the patch part", async () => {
		// `parseInt` stops at the first non-digit, so `3-beta` becomes `3`
		write("package.json", JSON.stringify({ version: "0.0.1" }));
		await setVersion("1.2.3-beta");
		expect(readJson("package.json").version).toBe("1.2.3");
	});
});

describe("package.json rewriting", () => {
	it("adds no version field to a manifest that has none", async () => {
		write("package.json", JSON.stringify({ name: "x" }));
		await setVersion("1.2.3");
		expect(readJson("package.json")).toEqual({ name: "x" });
	});

	it("rewrites nested manifests", async () => {
		write("packages/a/package.json", JSON.stringify({ version: "0.0.1" }));
		await setVersion("1.2.3");
		expect(readJson("packages/a/package.json").version).toBe("1.2.3");
	});

	it("pins prosopo dependencies to the new version", async () => {
		write(
			"package.json",
			JSON.stringify({
				version: "0.0.1",
				dependencies: { "@prosopo/util": "1.0.0", express: "4.0.0" },
			}),
		);
		await setVersion("1.2.3");
		expect(readJson("package.json").dependencies).toEqual({
			"@prosopo/util": "1.2.3",
			express: "4.0.0",
		});
	});

	it("pins dev and peer dependencies too", async () => {
		write(
			"package.json",
			JSON.stringify({
				devDependencies: { "@prosopo/config": "1.0.0" },
				peerDependencies: { "@prosopo/types": "1.0.0" },
			}),
		);
		await setVersion("1.2.3");
		const json = readJson("package.json");
		expect(json.devDependencies).toEqual({ "@prosopo/config": "1.2.3" });
		expect(json.peerDependencies).toEqual({ "@prosopo/types": "1.2.3" });
	});

	it("leaves typechain packages alone, as they are versioned elsewhere", async () => {
		write(
			"package.json",
			JSON.stringify({
				dependencies: { "@prosopo/typechain-types": "9.9.9" },
			}),
		);
		await setVersion("1.2.3");
		expect(readJson("package.json").dependencies).toEqual({
			"@prosopo/typechain-types": "9.9.9",
		});
	});

	it("writes four space indented json with a trailing newline", async () => {
		write("package.json", JSON.stringify({ version: "0.0.1" }));
		await setVersion("1.2.3");
		expect(read("package.json")).toBe('{\n    "version": "1.2.3"\n}\n');
	});

	it("skips manifests under node_modules", async () => {
		const original = JSON.stringify({ version: "0.0.1" });
		write("node_modules/dep/package.json", original);
		await setVersion("1.2.3");
		expect(read("node_modules/dep/package.json")).toBe(original);
	});

	it("skips manifests under cargo-cache", async () => {
		const original = JSON.stringify({ version: "0.0.1" });
		write("cargo-cache/dep/package.json", original);
		await setVersion("1.2.3");
		expect(read("cargo-cache/dep/package.json")).toBe(original);
	});

	it("skips caller supplied ignore paths", async () => {
		const original = JSON.stringify({ version: "0.0.1" });
		write("skipme/package.json", original);
		write("keepme/package.json", original);
		await setVersion("1.2.3", ["skipme"]);
		expect(read("skipme/package.json")).toBe(original);
		expect(readJson("keepme/package.json").version).toBe("1.2.3");
	});

	it("ignores files that are not manifests", async () => {
		write("other.json", "{}");
		await setVersion("1.2.3");
		expect(read("other.json")).toBe("{}");
	});

	it("resolves when the tree holds no manifests at all", async () => {
		await expect(setVersion("1.2.3")).resolves.toBeUndefined();
	});

	it("rejects when a manifest holds invalid json", async () => {
		write("package.json", "{ not json");
		await expect(setVersion("1.2.3")).rejects.toThrow();
	});
});

describe("Cargo.toml rewriting", () => {
	it("sets the package version", async () => {
		write("crates/a/Cargo.toml", '[package]\nname = "a"\nversion = "0.0.1"\n');
		await setVersion("1.2.3");
		expect(readToml("crates/a/Cargo.toml")).toMatchObject({
			package: { version: "1.2.3" },
		});
	});

	it("sets the workspace version", async () => {
		write("Cargo.toml", '[workspace]\nversion = "0.0.1"\n');
		await setVersion("1.2.3");
		expect(readToml("Cargo.toml")).toMatchObject({
			workspace: { version: "1.2.3" },
		});
	});

	it("leaves a workspace manifest with no version field alone", async () => {
		write("Cargo.toml", '[workspace]\nmembers = ["a"]\n');
		await setVersion("1.2.3");
		expect(readToml("Cargo.toml")).toEqual({ workspace: { members: ["a"] } });
	});

	it("rejects a manifest with neither a package nor a workspace section", async () => {
		write("Cargo.toml", '[dependencies]\nserde = "1"\n');
		await expect(setVersion("1.2.3")).rejects.toThrow();
	});

	it("takes a path dependency's version from the manifest it points at", async () => {
		write("crates/a/Cargo.toml", '[package]\nname = "a"\nversion = "0.0.1"\n');
		write(
			"crates/b/Cargo.toml",
			'[package]\nname = "b"\nversion = "0.0.1"\n\n[dependencies]\na = { path = "../a", version = "0.0.1" }\n',
		);
		await setVersion("1.2.3");
		expect(readToml("crates/b/Cargo.toml")).toMatchObject({
			dependencies: { a: { path: "../a", version: "1.2.3" } },
		});
	});

	it("does the same for dev dependencies", async () => {
		write("crates/a/Cargo.toml", '[package]\nname = "a"\nversion = "0.0.1"\n');
		write(
			"crates/b/Cargo.toml",
			'[package]\nname = "b"\nversion = "0.0.1"\n\n[dev-dependencies]\na = { path = "../a", version = "0.0.1" }\n',
		);
		await setVersion("1.2.3");
		expect(readToml("crates/b/Cargo.toml")).toMatchObject({
			"dev-dependencies": { a: { path: "../a", version: "1.2.3" } },
		});
	});

	it("leaves registry dependencies untouched", async () => {
		write(
			"Cargo.toml",
			'[package]\nname = "b"\nversion = "0.0.1"\n\n[dependencies]\nserde = "1.0.0"\n',
		);
		await setVersion("1.2.3");
		expect(readToml("Cargo.toml")).toMatchObject({
			dependencies: { serde: "1.0.0" },
		});
	});

	it("leaves a path dependency alone when the target manifest is missing", async () => {
		write(
			"crates/b/Cargo.toml",
			'[package]\nname = "b"\nversion = "0.0.1"\n\n[dependencies]\na = { path = "../a", version = "0.0.1" }\n',
		);
		await setVersion("1.2.3");
		expect(readToml("crates/b/Cargo.toml")).toMatchObject({
			dependencies: { a: { path: "../a", version: "0.0.1" } },
		});
	});

	it("skips tomls under node_modules", async () => {
		const original = '[package]\nname = "a"\nversion = "0.0.1"\n';
		write("node_modules/a/Cargo.toml", original);
		await setVersion("1.2.3");
		expect(read("node_modules/a/Cargo.toml")).toBe(original);
	});

	it("ignores tomls that are not Cargo manifests", async () => {
		write("other.toml", 'x = "1"\n');
		await setVersion("1.2.3");
		expect(read("other.toml")).toBe('x = "1"\n');
	});

	it("rejects when a manifest holds invalid toml", async () => {
		write("Cargo.toml", "[package\n");
		await expect(setVersion("1.2.3")).rejects.toThrow();
	});

	it("updates both a package.json and a Cargo.toml in one run", async () => {
		write("package.json", JSON.stringify({ version: "0.0.1" }));
		write("Cargo.toml", '[package]\nname = "a"\nversion = "0.0.1"\n');
		await setVersion("1.2.3");
		expect(readJson("package.json").version).toBe("1.2.3");
		expect(readToml("Cargo.toml")).toMatchObject({
			package: { version: "1.2.3" },
		});
	});
});
