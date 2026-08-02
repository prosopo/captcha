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

import * as core from "@actions/core";
import * as github from "@actions/github";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { type BotDeps, defaultDeps, main } from "../bot.js";

/**
 * `context.repo` falls back to the event payload's `repository` when
 * GITHUB_REPOSITORY is unset, and inside a workflow that payload is populated —
 * so clearing the variable alone does not reach the throwing path.
 */
const withoutRepository = (run: () => void): void => {
	const payload = github.context.payload;
	const repository = payload.repository;
	Reflect.deleteProperty(process.env, "GITHUB_REPOSITORY");
	Reflect.deleteProperty(payload, "repository");
	try {
		run();
	} finally {
		if (repository !== undefined) {
			payload.repository = repository;
		}
	}
};

const saved: Record<string, string | undefined> = {};

const set = (name: string, value: string | undefined): void => {
	if (!(name in saved)) {
		saved[name] = process.env[name];
	}
	if (value === undefined) {
		Reflect.deleteProperty(process.env, name);
	} else {
		process.env[name] = value;
	}
};

beforeEach(() => {
	// core.getInput reads INPUT_* out of the environment, so clearing it is how
	// a workflow that declared no input is simulated.
	set("INPUT_GITHUB-TOKEN", undefined);
	set("GITHUB_TOKEN", undefined);
	set("GH_TOKEN", undefined);
	set("GITHUB_REPOSITORY", "prosopo/captcha");
});

afterEach(() => {
	for (const [name, value] of Object.entries(saved)) {
		if (value === undefined) {
			Reflect.deleteProperty(process.env, name);
		} else {
			process.env[name] = value;
		}
	}
	vi.restoreAllMocks();
});

describe("defaultDeps", () => {
	test("builds a working dependency set from the environment", () => {
		set("GITHUB_TOKEN", "ghp_notarealtoken");
		const deps: BotDeps = defaultDeps();
		expect(typeof deps.api.review).toBe("function");
		expect(deps.event.repo).toEqual({ owner: "prosopo", repo: "captcha" });
		expect(deps.log).toBe(console.log);
	});

	test("takes the token from the action input in preference", () => {
		set("INPUT_GITHUB-TOKEN", "from-input");
		set("GITHUB_TOKEN", "from-env");
		// Nothing observable distinguishes the two clients, so the assertion is
		// that it built one at all rather than throwing.
		expect(() => defaultDeps()).not.toThrow();
	});

	test("refuses to run with no token at all", () => {
		// It used to build an unauthenticated client from an empty string and
		// fail with a 401 after it had already reacted to the comment.
		expect(() => defaultDeps()).toThrow("no github token");
	});

	test("treats an empty token as no token", () => {
		set("GITHUB_TOKEN", "");
		set("GH_TOKEN", "");
		expect(() => defaultDeps()).toThrow("no github token");
	});

	test("propagates a context that cannot be read", () => {
		set("GITHUB_TOKEN", "ghp_notarealtoken");
		withoutRepository(() => {
			expect(() => defaultDeps()).toThrow("GITHUB_REPOSITORY");
		});
	});
});

describe("main", () => {
	test("fails the action when the dependencies cannot be built", async () => {
		const setFailed = vi
			.spyOn(core, "setFailed")
			.mockImplementation((): void => undefined);
		vi.spyOn(console, "error").mockImplementation((): void => undefined);
		await main();
		expect(setFailed).toHaveBeenCalledWith(
			expect.stringContaining("no github token"),
		);
	});

	test("does not reject — a thrown error would lose the annotation", async () => {
		vi.spyOn(core, "setFailed").mockImplementation((): void => undefined);
		vi.spyOn(console, "error").mockImplementation((): void => undefined);
		await expect(main()).resolves.toBeUndefined();
	});

	test("logs the whole error, not just its message", async () => {
		// The message alone is what the annotation shows; the stack goes to the
		// job log, which is the only place it can be read afterwards.
		vi.spyOn(core, "setFailed").mockImplementation((): void => undefined);
		const error = vi
			.spyOn(console, "error")
			.mockImplementation((): void => undefined);
		await main();
		expect(error).toHaveBeenCalledWith(expect.any(Error));
	});

	test("runs to completion when the event is not a comment", async () => {
		// The happy path that makes no requests: a token is present, the context
		// is readable, and run() bails on the event name.
		set("GITHUB_TOKEN", "ghp_notarealtoken");
		const setFailed = vi
			.spyOn(core, "setFailed")
			.mockImplementation((): void => undefined);
		vi.spyOn(console, "log").mockImplementation((): void => undefined);
		await main();
		expect(setFailed).not.toHaveBeenCalled();
	});

	test("fails the action when something that is not an Error is thrown", async () => {
		// core.getInput throws on a malformed action input, and a thrown string
		// has no .message — the annotation used to read "undefined".
		vi.spyOn(core, "getInput").mockImplementation((): string => {
			throw "input is not valid";
		});
		const setFailed = vi
			.spyOn(core, "setFailed")
			.mockImplementation((): void => undefined);
		vi.spyOn(console, "error").mockImplementation((): void => undefined);
		await main();
		expect(setFailed).toHaveBeenCalledWith("input is not valid");
	});
});
