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
import type { ProsopoConfigOutput } from "@prosopo/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// `@prosopo/cli` is only reached by `setup()`, which shells out to a live
// provider environment; stubbing it keeps this suite to the pure file logic
// and avoids depending on that package being built.
vi.mock("@prosopo/cli", () => ({
	defaultConfig: (): ProsopoConfigOutput => {
		throw new Error("defaultConfig is not used by these tests");
	},
	getSecret: (): string => "",
}));

// Same again for the provider environment and keyring, which drag in the whole
// server stack.
vi.mock("@prosopo/env", () => ({
	ProviderEnvironment: class {},
}));
vi.mock("@prosopo/keyring", () => ({
	generateMnemonic: (): Promise<[string, string]> => Promise.resolve(["", ""]),
	getDefaultSiteKeys: (): [] => [],
	getPair: (): undefined => undefined,
}));
vi.mock("./provider.js", () => ({
	setupProvider: (): Promise<void> => Promise.resolve(),
}));
vi.mock("./site.js", () => ({
	registerSiteKey: (): Promise<void> => Promise.resolve(),
}));

const { updateEnvFile } = await import("./setup.js");

// `updateEnvFile` resolves the file through PROSOPO_ROOT_DIR, so each test
// points that at a throwaway directory holding a `.env.test`.
const ENV_FILE = ".env.test";

let root = "";

const write = (contents: string): void => {
	fs.writeFileSync(path.join(root, ENV_FILE), contents);
};

const read = (): string => fs.readFileSync(path.join(root, ENV_FILE), "utf8");

beforeEach(() => {
	root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "setup-")));
	vi.stubEnv("PROSOPO_ROOT_DIR", root);
});

afterEach(() => {
	vi.unstubAllEnvs();
	fs.rmSync(root, { recursive: true, force: true });
});

describe("updateEnvFile", () => {
	it("replaces the value of an existing variable", async () => {
		write("A=old\n");
		await updateEnvFile({ A: "new" });
		expect(read()).toBe("A=new\n");
	});

	it("appends a variable that is not already present", async () => {
		write("A=1");
		await updateEnvFile({ B: "2" });
		expect(read()).toBe("A=1\nB=2");
	});

	it("updates several variables in one call", async () => {
		write("A=1\nB=2\n");
		await updateEnvFile({ A: "x", B: "y" });
		expect(read()).toBe("A=x\nB=y\n");
	});

	it("mixes replacement and appending", async () => {
		write("A=1\n");
		await updateEnvFile({ A: "x", B: "y" });
		expect(read()).toBe("A=x\n\nB=y");
	});

	it("leaves the file untouched when given no variables", async () => {
		write("A=1\n");
		await updateEnvFile({});
		expect(read()).toBe("A=1\n");
	});

	it("writes an empty value", async () => {
		write("A=1\n");
		await updateEnvFile({ A: "" });
		expect(read()).toBe("A=\n");
	});

	it("replaces every occurrence of a repeated variable", async () => {
		// the matcher is global, so a duplicated key is rewritten twice
		write("A=1\nA=2\n");
		await updateEnvFile({ A: "3" });
		expect(read()).toBe("A=3\nA=3\n");
	});

	it("keeps quotes supplied by the caller", async () => {
		write("MNEMONIC=old\n");
		await updateEnvFile({ MNEMONIC: '"a b c"' });
		expect(read()).toBe('MNEMONIC="a b c"\n');
	});

	it("also rewrites a commented out assignment, as the matcher is loose", async () => {
		write("# A=1\n");
		await updateEnvFile({ A: "2" });
		expect(read()).toBe("A=2\n");
	});

	it("appends to an empty file", async () => {
		write("");
		await updateEnvFile({ A: "1" });
		expect(read()).toBe("\nA=1");
	});

	it("rejects when the env file does not exist", async () => {
		await expect(updateEnvFile({ A: "1" })).rejects.toThrow();
	});
});
