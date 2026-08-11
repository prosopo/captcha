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
	type BotDeps,
	approve,
	commands,
	disapprove,
	help,
	lookupCommand,
	usage,
} from "../bot.js";
import { type DepsMock, createDeps } from "./fixtures.js";

describe("approve", () => {
	test("submits an approving review naming the requester", () => {
		const deps: DepsMock = createDeps({ actor: "alice" });
		return approve(deps).then(() => {
			expect(deps.api.review).toHaveBeenCalledWith({
				owner: "prosopo",
				repo: "captcha",
				pull_number: 7,
				event: "APPROVE",
				body: "Approved by @alice",
			});
		});
	});

	test("acknowledges the comment it acted on", () => {
		const deps: DepsMock = createDeps({ commentId: 55 });
		return approve(deps).then(() => {
			expect(deps.api.react).toHaveBeenCalledWith({
				owner: "prosopo",
				repo: "captcha",
				comment_id: 55,
				content: "+1",
			});
		});
	});

	test("reviews before reacting, and awaits both", async () => {
		// The order is the point: the thumbs up says the review landed, so it
		// must not be sent first or in parallel.
		const order: string[] = [];
		const deps: DepsMock = createDeps();
		deps.api.review.mockImplementation(async () => {
			order.push("review");
		});
		deps.api.react.mockImplementation(async () => {
			order.push("react");
		});
		await approve(deps);
		expect(order).toEqual(["review", "react"]);
	});

	test("does not react when the review is rejected", async () => {
		// Previously neither call was awaited, so the comment got a thumbs up
		// even when the review had failed.
		const deps: DepsMock = createDeps();
		deps.api.review.mockRejectedValue(new Error("422 unprocessable"));
		await expect(approve(deps)).rejects.toThrow("422 unprocessable");
		expect(deps.api.react).not.toHaveBeenCalled();
	});

	test("propagates a failed reaction so the action fails", async () => {
		const deps: DepsMock = createDeps();
		deps.api.react.mockRejectedValue(new Error("403 forbidden"));
		await expect(approve(deps)).rejects.toThrow("403 forbidden");
	});

	test("refuses to act on a payload with no issue number", async () => {
		// It used to send -1, which GitHub answers with a 404 that was then
		// swallowed, so the run looked successful.
		const deps: DepsMock = createDeps({ issueNumber: undefined });
		await expect(approve(deps)).rejects.toThrow("no issue number");
		expect(deps.api.review).not.toHaveBeenCalled();
	});

	test("refuses to react to a payload with no comment id", async () => {
		const deps: DepsMock = createDeps({ commentId: undefined });
		await expect(approve(deps)).rejects.toThrow("no comment id");
		// The review is already submitted by then — the ids are validated where
		// they are used, not up front.
		expect(deps.api.review).toHaveBeenCalled();
	});

	test("accepts issue number zero, which is falsy but not missing", async () => {
		// The old `|| -1` would have replaced it; only undefined is missing.
		const deps: DepsMock = createDeps({ issueNumber: 0, commentId: 0 });
		await approve(deps);
		expect(deps.api.review).toHaveBeenCalledWith(
			expect.objectContaining({ pull_number: 0 }),
		);
		expect(deps.api.react).toHaveBeenCalledWith(
			expect.objectContaining({ comment_id: 0 }),
		);
	});
});

describe("disapprove", () => {
	test("requests changes rather than approving", async () => {
		const deps: DepsMock = createDeps({ actor: "bob" });
		await disapprove(deps);
		expect(deps.api.review).toHaveBeenCalledWith(
			expect.objectContaining({
				event: "REQUEST_CHANGES",
				body: "Disapproved by @bob",
			}),
		);
	});

	test("still acknowledges the comment", async () => {
		const deps: DepsMock = createDeps();
		await disapprove(deps);
		expect(deps.api.react).toHaveBeenCalledWith(
			expect.objectContaining({ content: "+1" }),
		);
	});
});

describe("help", () => {
	test("comments with every command it knows, sorted", async () => {
		const deps: DepsMock = createDeps();
		await help(deps);
		expect(deps.api.comment).toHaveBeenCalledWith({
			owner: "prosopo",
			repo: "captcha",
			issue_number: 7,
			body: "My commands are: accept, approve, disapprove, help, reject",
		});
	});

	test("lists exactly the keys that can be dispatched", async () => {
		// The listing is generated from the same table run() looks commands up
		// in, so an alias cannot be advertised without working.
		const deps: DepsMock = createDeps();
		await help(deps);
		const body = deps.api.comment.mock.calls[0]?.[0]?.body ?? "";
		for (const name of Object.keys(commands)) {
			expect(body).toContain(name);
		}
	});

	test("neither reviews nor reacts", async () => {
		const deps: DepsMock = createDeps();
		await help(deps);
		expect(deps.api.review).not.toHaveBeenCalled();
		expect(deps.api.react).not.toHaveBeenCalled();
	});

	test("refuses a payload with no issue number", async () => {
		const deps: DepsMock = createDeps({ issueNumber: undefined });
		await expect(help(deps)).rejects.toThrow("no issue number");
	});

	test("propagates a failed comment", async () => {
		const deps: DepsMock = createDeps();
		deps.api.comment.mockRejectedValue(new Error("410 gone"));
		await expect(help(deps)).rejects.toThrow("410 gone");
	});
});

describe("usage", () => {
	test("reacts confused and does nothing else", async () => {
		const deps: DepsMock = createDeps({ commentId: 9 });
		await usage(deps);
		expect(deps.api.react).toHaveBeenCalledWith({
			owner: "prosopo",
			repo: "captcha",
			comment_id: 9,
			content: "confused",
		});
		expect(deps.api.review).not.toHaveBeenCalled();
		expect(deps.api.comment).not.toHaveBeenCalled();
	});

	test("refuses a payload with no comment id", async () => {
		const deps: DepsMock = createDeps({ commentId: undefined });
		await expect(usage(deps)).rejects.toThrow("no comment id");
	});
});

describe("the command table", () => {
	test("aliases point at the same implementation", () => {
		// accept and reject are documented as synonyms; sharing the function is
		// what keeps them from drifting.
		expect(commands.accept).toBe(commands.approve);
		expect(commands.reject).toBe(commands.disapprove);
	});

	test("holds only the five documented commands", () => {
		expect(Object.keys(commands).sort()).toEqual([
			"accept",
			"approve",
			"disapprove",
			"help",
			"reject",
		]);
	});

	test("every entry is callable with the same dependencies", async () => {
		for (const name of Object.keys(commands)) {
			const deps: DepsMock = createDeps();
			const command = commands[name];
			expect(command).toBeDefined();
			await expect(
				(command as (deps: BotDeps) => Promise<void>)(deps),
			).resolves.toBeUndefined();
		}
	});

	test("is looked up without inheriting from Object.prototype", () => {
		// The name comes from a comment, so a plain property access would
		// resolve these to real functions and dispatch them.
		for (const name of [
			"constructor",
			"toString",
			"hasOwnProperty",
			"__proto__",
		]) {
			expect(lookupCommand(name)).toBeUndefined();
		}
	});

	test("looks up the real commands and nothing else", () => {
		expect(lookupCommand("approve")).toBe(commands.approve);
		expect(lookupCommand("frobnicate")).toBeUndefined();
		expect(lookupCommand("")).toBeUndefined();
	});
});
