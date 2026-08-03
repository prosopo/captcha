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
import { LogLevel, type Logger, getLogger } from "@prosopo/logger";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	findEnvFiles,
	updateDemoHTMLFiles,
	updateEnvFiles,
} from "./updateEnv.js";

// The helpers glob against `getEnv()`, which reads NODE_ENV; vitest runs with
// NODE_ENV=test so the files under test are named `.env.test`.
const ENV_FILE = ".env.test";
const logger: Logger = getLogger(LogLevel.enum.error, "updateEnv.test");

let root = "";
let cwd = "";

const write = (relative: string, contents: string): string => {
	const full = path.join(root, relative);
	fs.mkdirSync(path.dirname(full), { recursive: true });
	fs.writeFileSync(full, contents);
	return full;
};

const read = (relative: string): string =>
	fs.readFileSync(path.join(root, relative), "utf8");

beforeEach(() => {
	cwd = process.cwd();
	root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "updateEnv-")));
});

afterEach(() => {
	process.chdir(cwd);
	fs.rmSync(root, { recursive: true, force: true });
});

describe("findEnvFiles", () => {
	it("returns an empty list when the tree holds no env files", async () => {
		expect(await findEnvFiles(logger, root)).toEqual([]);
	});

	it("finds an env file nested in the tree", async () => {
		write(`a/b/${ENV_FILE}`, "A=1");
		expect(await findEnvFiles(logger, root)).toEqual([
			`${root}/a/b/${ENV_FILE}`,
		]);
	});

	it("finds every env file in the tree", async () => {
		write(`a/${ENV_FILE}`, "A=1");
		write(`b/${ENV_FILE}`, "A=2");
		expect((await findEnvFiles(logger, root)).sort()).toEqual([
			`${root}/a/${ENV_FILE}`,
			`${root}/b/${ENV_FILE}`,
		]);
	});

	it("ignores env files inside node_modules", async () => {
		write(`node_modules/pkg/${ENV_FILE}`, "A=1");
		expect(await findEnvFiles(logger, root)).toEqual([]);
	});

	it("ignores env files for other environments", async () => {
		write("a/.env.production", "A=1");
		expect(await findEnvFiles(logger, root)).toEqual([]);
	});

	it("matches a file sitting directly at the search root", async () => {
		// `**/` also matches zero path segments
		write(ENV_FILE, "A=1");
		expect(await findEnvFiles(logger, root)).toEqual([`${root}/${ENV_FILE}`]);
	});
});

describe("updateEnvFiles", () => {
	it("replaces the value of a matching variable", async () => {
		write(`a/${ENV_FILE}`, "SITE_KEY=old\nOTHER=keep");
		await updateEnvFiles(["SITE_KEY"], "new", logger, root);
		expect(read(`a/${ENV_FILE}`)).toBe("SITE_KEY=new\nOTHER=keep");
	});

	it("leaves a file with no matching variable untouched", async () => {
		const original = "OTHER=keep\n# comment\n";
		write(`a/${ENV_FILE}`, original);
		await updateEnvFiles(["SITE_KEY"], "new", logger, root);
		expect(read(`a/${ENV_FILE}`)).toBe(original);
	});

	it("replaces several variables in one pass", async () => {
		write(`a/${ENV_FILE}`, "ONE=a\nTWO=b");
		await updateEnvFiles(["ONE", "TWO"], "z", logger, root);
		expect(read(`a/${ENV_FILE}`)).toBe("ONE=z\nTWO=z");
	});

	it("updates every matching file found", async () => {
		write(`a/${ENV_FILE}`, "K=1");
		write(`b/${ENV_FILE}`, "K=2");
		await updateEnvFiles(["K"], "3", logger, root);
		expect(read(`a/${ENV_FILE}`)).toBe("K=3");
		expect(read(`b/${ENV_FILE}`)).toBe("K=3");
	});

	it("accepts an empty list of variable names without writing", async () => {
		const original = "K=1\n";
		write(`a/${ENV_FILE}`, original);
		await updateEnvFiles([], "3", logger, root);
		expect(read(`a/${ENV_FILE}`)).toBe(original);
	});

	it("drops comments and blank lines from a file it rewrites", async () => {
		// dotenv.parse discards everything but key/value pairs, so a rewritten
		// file loses its comments. This is existing behaviour, pinned here.
		write(`a/${ENV_FILE}`, "# a comment\n\nK=1\n");
		await updateEnvFiles(["K"], "2", logger, root);
		expect(read(`a/${ENV_FILE}`)).toBe("K=2");
	});

	it("writes an empty value when asked to", async () => {
		write(`a/${ENV_FILE}`, "K=1");
		await updateEnvFiles(["K"], "", logger, root);
		expect(read(`a/${ENV_FILE}`)).toBe("K=");
	});

	it("resolves without error when no env files exist", async () => {
		await expect(
			updateEnvFiles(["K"], "1", logger, root),
		).resolves.toBeUndefined();
	});
});

describe("updateDemoHTMLFiles", () => {
	const SITE_KEY = "A".repeat(48);
	const NEW_KEY = "B".repeat(48);

	// The glob is hard coded to `../../demos/**/*.html`, so the cwd has to sit
	// two levels below the demos directory.
	const inDemos = (relative: string, contents: string): string => {
		const full = write(path.join("demos", relative), contents);
		fs.mkdirSync(path.join(root, "dev", "scripts"), { recursive: true });
		process.chdir(path.join(root, "dev", "scripts"));
		return full;
	};

	const matchers = [/data-sitekey="(\w{48})"/, /siteKey:\s*'(\w{48})'/];

	it("replaces a site key in an html attribute", async () => {
		inDemos("app/index.html", `<div data-sitekey="${SITE_KEY}"></div>`);
		await updateDemoHTMLFiles(matchers, NEW_KEY, logger);
		expect(read("demos/app/index.html")).toBe(
			`<div data-sitekey="${NEW_KEY}"></div>`,
		);
	});

	it("replaces a site key matched by the second matcher", async () => {
		inDemos("app/index.html", `<script>siteKey: '${SITE_KEY}'</script>`);
		await updateDemoHTMLFiles(matchers, NEW_KEY, logger);
		expect(read("demos/app/index.html")).toBe(
			`<script>siteKey: '${NEW_KEY}'</script>`,
		);
	});

	it("replaces every occurrence of the matched key", async () => {
		inDemos(
			"app/index.html",
			`<a data-sitekey="${SITE_KEY}"></a><b>${SITE_KEY}</b>`,
		);
		await updateDemoHTMLFiles(matchers, NEW_KEY, logger);
		expect(read("demos/app/index.html")).toBe(
			`<a data-sitekey="${NEW_KEY}"></a><b>${NEW_KEY}</b>`,
		);
	});

	it("leaves a file with no match untouched", async () => {
		inDemos("app/index.html", "<div></div>");
		await updateDemoHTMLFiles(matchers, NEW_KEY, logger);
		expect(read("demos/app/index.html")).toBe("<div></div>");
	});

	it("does nothing when the matcher list is empty", async () => {
		inDemos("app/index.html", `<div data-sitekey="${SITE_KEY}"></div>`);
		await updateDemoHTMLFiles([], NEW_KEY, logger);
		expect(read("demos/app/index.html")).toBe(
			`<div data-sitekey="${SITE_KEY}"></div>`,
		);
	});

	it("resolves when no html files exist", async () => {
		fs.mkdirSync(path.join(root, "dev", "scripts"), { recursive: true });
		process.chdir(path.join(root, "dev", "scripts"));
		await expect(
			updateDemoHTMLFiles(matchers, NEW_KEY, logger),
		).resolves.toBeUndefined();
	});

	it("stops at the first matcher that hits", async () => {
		// both matchers hit, but only the first one's capture is replaced
		inDemos(
			"app/index.html",
			`<div data-sitekey="${SITE_KEY}"></div><script>siteKey: '${"C".repeat(48)}'</script>`,
		);
		await updateDemoHTMLFiles(matchers, NEW_KEY, logger);
		expect(read("demos/app/index.html")).toBe(
			`<div data-sitekey="${NEW_KEY}"></div><script>siteKey: '${"C".repeat(48)}'</script>`,
		);
	});
});
