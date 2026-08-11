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

import { describe, expect, test } from "vitest";
import {
	type NotACommand,
	type ParsedCommand,
	TAG,
	isParsedCommand,
	parseCommand,
} from "../bot.js";

const parsed = (body: string | undefined): ParsedCommand => {
	const result: ParsedCommand | NotACommand = parseCommand(body);
	if (!isParsedCommand(result)) {
		throw new Error(`expected a command, got: ${result.reason}`);
	}
	return result;
};

const rejected = (body: string | undefined): string => {
	const result: ParsedCommand | NotACommand = parseCommand(body);
	if (isParsedCommand(result)) {
		throw new Error(`expected a rejection, got: ${result.command}`);
	}
	return result.reason;
};

describe("parseCommand", () => {
	test("reads the command that follows the tag", () => {
		expect(parsed(`@${TAG} approve`)).toEqual({ command: "approve", args: [] });
	});

	test("collects everything after the command as arguments", () => {
		expect(parsed(`@${TAG} approve one two`)).toEqual({
			command: "approve",
			args: ["one", "two"],
		});
	});

	test("ignores a comment that does not open with the tag", () => {
		// Mentioning the bot mid-sentence is conversation, not an instruction —
		// otherwise quoting someone else's command would re-run it.
		expect(rejected(`please @${TAG} approve`)).toBe(
			"Bot not tagged in comment",
		);
	});

	test("ignores a similar but different mention", () => {
		expect(rejected(`@${TAG}bot approve`)).toBe("Bot not tagged in comment");
		expect(rejected(`@not${TAG} approve`)).toBe("Bot not tagged in comment");
	});

	test("requires the @ prefix", () => {
		expect(rejected(`${TAG} approve`)).toBe("Bot not tagged in comment");
	});

	test("reports a tag with nothing after it", () => {
		expect(rejected(`@${TAG}`)).toBe("No command found in comment");
		expect(rejected(`@${TAG}   `)).toBe("No command found in comment");
	});

	test("reports an empty comment", () => {
		expect(rejected("")).toBe("No words found in comment");
		expect(rejected("   ")).toBe("No words found in comment");
		expect(rejected("\n\t ")).toBe("No words found in comment");
	});

	test("reports a comment with no body at all", () => {
		// A deleted comment arrives with the field missing; this used to throw
		// inside split and fail the whole action.
		expect(rejected(undefined)).toBe("Comment has no body");
	});

	test("tolerates any run of whitespace between words", () => {
		// GitHub comments are markdown, so a command may well sit on its own
		// line or be separated by a tab.
		expect(parsed(`@${TAG}\n\napprove`)).toEqual({
			command: "approve",
			args: [],
		});
		expect(parsed(`@${TAG}\tapprove\t x `)).toEqual({
			command: "approve",
			args: ["x"],
		});
		expect(parsed(`@${TAG}    approve`)).toEqual({
			command: "approve",
			args: [],
		});
	});

	test("does not normalise the command's case", () => {
		// Documents current behaviour: lookup is exact, so "APPROVE" falls
		// through to the usage reaction rather than approving.
		expect(parsed(`@${TAG} APPROVE`).command).toBe("APPROVE");
	});

	test("returns an unknown command rather than rejecting it", () => {
		// run() distinguishes "not addressed to me" from "I do not know that",
		// and only the second earns a reply.
		expect(parsed(`@${TAG} frobnicate`)).toEqual({
			command: "frobnicate",
			args: [],
		});
	});

	test("keeps a very long comment's command", () => {
		const body = `@${TAG} approve ${"word ".repeat(1000)}`;
		const result: ParsedCommand = parsed(body);
		expect(result.command).toBe("approve");
		expect(result.args.length).toBe(1000);
	});
});

describe("isParsedCommand", () => {
	test("narrows the two results apart", () => {
		expect(isParsedCommand({ command: "approve", args: [] })).toBe(true);
		expect(isParsedCommand({ reason: "nope" })).toBe(false);
	});
});
