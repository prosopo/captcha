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
import {
	type BotDeps,
	type CommentEvent,
	type GitHubApi,
	type NotACommand,
	type ParsedCommand,
	approve,
	commands,
	createGitHubApi,
	defaultDeps,
	disapprove,
	help,
	isParsedCommand,
	lookupCommand,
	main,
	parseCommand,
	resolveToken,
	run,
	usage,
} from "../index.js";

describe("CommentEvent", () => {
	test("every field the payload may omit is optional in the type", () => {
		expectTypeOf<CommentEvent["commentId"]>().toEqualTypeOf<
			number | undefined
		>();
		expectTypeOf<CommentEvent["issueNumber"]>().toEqualTypeOf<
			number | undefined
		>();
		expectTypeOf<CommentEvent["commentBody"]>().toEqualTypeOf<
			string | undefined
		>();
		expectTypeOf<CommentEvent["authorAssociation"]>().toEqualTypeOf<
			string | undefined
		>();
	});

	test("the fields the context always supplies are not optional", () => {
		expectTypeOf<CommentEvent["eventName"]>().toEqualTypeOf<string>();
		expectTypeOf<CommentEvent["actor"]>().toEqualTypeOf<string>();
		expectTypeOf<CommentEvent["repo"]>().toEqualTypeOf<{
			owner: string;
			repo: string;
		}>();
	});
});

describe("GitHubApi", () => {
	test("only the reactions the bot posts are accepted", () => {
		expectTypeOf<Parameters<GitHubApi["react"]>[0]["content"]>().toEqualTypeOf<
			"+1" | "confused"
		>();
		// @ts-expect-error a reaction the bot never posts
		assertType<Parameters<GitHubApi["react"]>[0]["content"]>("rocket");
	});

	test("only the two review verdicts are accepted", () => {
		expectTypeOf<Parameters<GitHubApi["review"]>[0]["event"]>().toEqualTypeOf<
			"APPROVE" | "REQUEST_CHANGES"
		>();
		// @ts-expect-error COMMENT would leave the pull request unreviewed
		assertType<Parameters<GitHubApi["review"]>[0]["event"]>("COMMENT");
	});

	test("the calls are awaitable, so a failed request can fail the run", () => {
		expectTypeOf<ReturnType<GitHubApi["react"]>>().toEqualTypeOf<
			Promise<unknown>
		>();
		expectTypeOf<ReturnType<GitHubApi["review"]>>().toEqualTypeOf<
			Promise<unknown>
		>();
		expectTypeOf<ReturnType<GitHubApi["comment"]>>().toEqualTypeOf<
			Promise<unknown>
		>();
	});

	test("a client bound from a token satisfies the interface", () => {
		expectTypeOf(createGitHubApi).toEqualTypeOf<(token: string) => GitHubApi>();
	});
});

describe("BotDeps", () => {
	test("the whole dependency set is required — there are no defaults", () => {
		const partial: Pick<BotDeps, "log"> = { log: (): void => undefined };
		// @ts-expect-error api and event are not optional
		assertType<BotDeps>(partial);
	});

	test("the logger takes anything, so args arrays can be logged directly", () => {
		expectTypeOf<BotDeps["log"]>().toEqualTypeOf<
			(...values: unknown[]) => void
		>();
		assertType<BotDeps["log"]>(console.log);
	});

	test("defaultDeps builds the set with no arguments", () => {
		expectTypeOf(defaultDeps).toEqualTypeOf<() => BotDeps>();
	});
});

describe("parseCommand", () => {
	test("a missing body is accepted, because payloads arrive without one", () => {
		expectTypeOf(parseCommand).parameter(0).toEqualTypeOf<string | undefined>();
	});

	test("the result must be narrowed before the command can be read", () => {
		const parsed: ParsedCommand | NotACommand = parseCommand("");
		// @ts-expect-error command only exists on the ParsedCommand branch
		parsed.command;
		if (isParsedCommand(parsed)) {
			expectTypeOf(parsed).toEqualTypeOf<ParsedCommand>();
			expectTypeOf(parsed.args).toEqualTypeOf<string[]>();
		} else {
			expectTypeOf(parsed).toEqualTypeOf<NotACommand>();
			expectTypeOf(parsed.reason).toEqualTypeOf<string>();
		}
	});
});

describe("commands", () => {
	test("a lookup can miss, so the caller has to handle an unknown command", () => {
		expectTypeOf(lookupCommand).returns.toEqualTypeOf<
			((deps: BotDeps) => Promise<void>) | undefined
		>();
	});

	test("the table cannot be reassigned command by command", () => {
		// @ts-expect-error the table is readonly
		commands.approve = help;
	});

	test("every command has the same shape, so the table stays dispatchable", () => {
		for (const command of [approve, disapprove, help, usage]) {
			expectTypeOf(command).toEqualTypeOf<(deps: BotDeps) => Promise<void>>();
		}
	});
});

describe("entrypoints", () => {
	test("run takes injected dependencies; main takes none", () => {
		expectTypeOf(run).toEqualTypeOf<(deps: BotDeps) => Promise<void>>();
		expectTypeOf(main).toEqualTypeOf<() => Promise<void>>();
	});

	test("resolveToken reports absence rather than an empty token", () => {
		expectTypeOf(resolveToken).returns.toEqualTypeOf<string | undefined>();
		expectTypeOf(resolveToken)
			.parameter(0)
			.toEqualTypeOf<(name: string) => string>();
		// process.env is assignable, which is how it is called in defaultDeps.
		expectTypeOf(resolveToken)
			.parameter(1)
			.toEqualTypeOf<Record<string, string | undefined>>();
	});
});
