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

import { afterEach, describe, expect, test, vi } from "vitest";
import {
	type CommentEvent,
	createGitHubApi,
	readCommentEvent,
	resolveToken,
} from "../bot.js";
import { isMain } from "../isMain.js";

const originalRepository: string | undefined = process.env.GITHUB_REPOSITORY;

const originalEventName: string | undefined = process.env.GITHUB_EVENT_NAME;
const originalActor: string | undefined = process.env.GITHUB_ACTOR;

const restore = (name: string, value: string | undefined): void => {
	if (value === undefined) {
		Reflect.deleteProperty(process.env, name);
	} else {
		process.env[name] = value;
	}
};

afterEach(() => {
	restore("GITHUB_REPOSITORY", originalRepository);
	restore("GITHUB_EVENT_NAME", originalEventName);
	restore("GITHUB_ACTOR", originalActor);
});

describe("resolveToken", () => {
	const noInput = (): string => "";

	test("prefers the action input", () => {
		expect(
			resolveToken(() => "from-input", {
				GITHUB_TOKEN: "from-env",
				GH_TOKEN: "from-gh",
			}),
		).toBe("from-input");
	});

	test("falls back to GITHUB_TOKEN, then GH_TOKEN", () => {
		expect(resolveToken(noInput, { GITHUB_TOKEN: "a", GH_TOKEN: "b" })).toBe(
			"a",
		);
		expect(resolveToken(noInput, { GH_TOKEN: "b" })).toBe("b");
	});

	test("treats an empty value as unset at every level", () => {
		// An unpopulated GitHub Actions expression expands to an empty string,
		// and core.getInput returns one for a missing input.
		expect(resolveToken(() => "", { GITHUB_TOKEN: "", GH_TOKEN: "b" })).toBe(
			"b",
		);
		expect(
			resolveToken(() => "", { GITHUB_TOKEN: "", GH_TOKEN: "" }),
		).toBeUndefined();
	});

	test("returns undefined rather than an empty token", () => {
		// The empty string used to be handed to getOctokit, producing an
		// unauthenticated client that failed on its first write.
		expect(resolveToken(noInput, {})).toBeUndefined();
	});

	test("asks for the input by the name the action declares", () => {
		const getInput = vi.fn<(name: string) => string>().mockReturnValue("t");
		resolveToken(getInput, {});
		expect(getInput).toHaveBeenCalledWith("github-token");
	});

	test("does not consult the environment once the input answers", () => {
		// Reading a token that was not asked for is how a workflow ends up using
		// a more privileged credential than it declared.
		const env: Record<string, string | undefined> = {};
		const proxied: Record<string, string | undefined> = new Proxy(env, {
			get: (): string => {
				throw new Error("environment must not be read");
			},
		});
		expect(resolveToken(() => "from-input", proxied)).toBe("from-input");
	});
});

describe("readCommentEvent", () => {
	test("reads a real @actions/github context", () => {
		// context.repo derives owner/repo from GITHUB_REPOSITORY, which every
		// workflow run sets.
		process.env.GITHUB_REPOSITORY = "prosopo/captcha";
		// Outside a workflow the payload is empty, so every optional field comes
		// back undefined rather than exploding.
		const event: CommentEvent = readCommentEvent();
		expect(event.repo).toEqual({ owner: "prosopo", repo: "captcha" });
		// eventName and actor are captured by @actions/github when the module is
		// first imported, so outside a workflow they are simply absent.
		expect(event.eventName).toBe(process.env.GITHUB_EVENT_NAME);
		expect(event.actor).toBe(process.env.GITHUB_ACTOR);
		expect(Object.keys(event).sort()).toEqual([
			"actor",
			"authorAssociation",
			"commentBody",
			"commentId",
			"eventName",
			"issueNumber",
			"repo",
		]);
	});

	test("reports every optional field as undefined outside a workflow", () => {
		// There is no event payload on disk, so the comment and issue fields are
		// all absent — the case the require* guards exist for.
		process.env.GITHUB_REPOSITORY = "prosopo/captcha";
		const event: CommentEvent = readCommentEvent();
		expect(event.commentId).toBeUndefined();
		expect(event.issueNumber).toBeUndefined();
		expect(event.commentBody).toBeUndefined();
		expect(event.authorAssociation).toBeUndefined();
	});

	test("re-reads the repository on each call, unlike the event name", () => {
		// context.repo is a getter over GITHUB_REPOSITORY; the rest of the
		// context was frozen when @actions/github was imported.
		process.env.GITHUB_REPOSITORY = "prosopo/other";
		expect(readCommentEvent().repo).toEqual({
			owner: "prosopo",
			repo: "other",
		});
	});

	test("throws when GITHUB_REPOSITORY is not set", () => {
		// @actions/github throws rather than guessing; main() turns it into a
		// failed action rather than a crash.
		Reflect.deleteProperty(process.env, "GITHUB_REPOSITORY");
		expect(() => readCommentEvent()).toThrow("GITHUB_REPOSITORY");
	});
});

describe("createGitHubApi", () => {
	test("exposes exactly the three calls the bot makes", () => {
		const api = createGitHubApi("ghp_notarealtoken");
		expect(typeof api.react).toBe("function");
		expect(typeof api.review).toBe("function");
		expect(typeof api.comment).toBe("function");
		expect(Object.keys(api).sort()).toEqual(["comment", "react", "review"]);
	});
});

describe("isMain", () => {
	test("recognises the module the process was started with", () => {
		expect(isMain("file:///srv/bot.js", ["node", "/srv/bot.js"])).toBe(true);
	});

	test("normalises the entry path before comparing", () => {
		expect(isMain("file:///srv/bot.js", ["node", "/srv/./bot.js"])).toBe(true);
	});

	test("rejects a different module", () => {
		expect(isMain("file:///srv/bot.js", ["node", "/srv/other.js"])).toBe(false);
	});

	test("rejects an argv with no entry, as in a repl", () => {
		expect(isMain("file:///srv/bot.js", ["node"])).toBe(false);
	});

	test("rejects a module url that is not a file", () => {
		// A data: or http: import cannot be the argv entrypoint, and
		// fileURLToPath throws on it.
		expect(isMain("data:text/javascript,0", ["node", "/srv/bot.js"])).toBe(
			false,
		);
		expect(isMain("not a url", ["node", "/srv/bot.js"])).toBe(false);
	});

	test("defaults to the real argv", () => {
		expect(typeof isMain(import.meta.url)).toBe("boolean");
	});
});
