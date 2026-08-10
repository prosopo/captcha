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
import { PRIVILEGED_ASSOCIATIONS, TAG, run } from "../bot.js";
import { type DepsMock, createDeps, loggedText } from "./fixtures.js";

const noCalls = (deps: DepsMock): void => {
	expect(deps.api.review).not.toHaveBeenCalled();
	expect(deps.api.react).not.toHaveBeenCalled();
	expect(deps.api.comment).not.toHaveBeenCalled();
};

describe("run", () => {
	test("dispatches a recognised command", async () => {
		const deps: DepsMock = createDeps({ commentBody: `@${TAG} approve` });
		await run(deps);
		expect(deps.api.review).toHaveBeenCalledWith(
			expect.objectContaining({ event: "APPROVE" }),
		);
	});

	test("dispatches through the aliases too", async () => {
		const deps: DepsMock = createDeps({ commentBody: `@${TAG} reject` });
		await run(deps);
		expect(deps.api.review).toHaveBeenCalledWith(
			expect.objectContaining({ event: "REQUEST_CHANGES" }),
		);
	});

	test("ignores an event that is not a comment", async () => {
		// The action can be wired to more triggers than it handles, so this is
		// the first thing checked.
		const deps: DepsMock = createDeps({ eventName: "pull_request" });
		await run(deps);
		noCalls(deps);
		expect(loggedText(deps.log)).toContain("not a comment");
	});

	test("ignores a comment the bot was not addressed in", async () => {
		const deps: DepsMock = createDeps({ commentBody: "looks good to me" });
		await run(deps);
		noCalls(deps);
		expect(loggedText(deps.log)).toContain("Bot not tagged");
	});

	test("stays silent on a comment with no body", async () => {
		const deps: DepsMock = createDeps({ commentBody: undefined });
		await run(deps);
		noCalls(deps);
	});

	test("reacts confused to a command it does not know", async () => {
		// It was addressed directly, so silence would look like a failure.
		const deps: DepsMock = createDeps({ commentBody: `@${TAG} frobnicate` });
		await run(deps);
		expect(deps.api.react).toHaveBeenCalledWith(
			expect.objectContaining({ content: "confused" }),
		);
		expect(deps.api.review).not.toHaveBeenCalled();
	});

	test("does not dispatch names inherited from Object.prototype", async () => {
		const deps: DepsMock = createDeps({ commentBody: `@${TAG} constructor` });
		await run(deps);
		expect(deps.api.react).toHaveBeenCalledWith(
			expect.objectContaining({ content: "confused" }),
		);
	});

	test("says nothing when the bot is tagged with no command", async () => {
		const deps: DepsMock = createDeps({ commentBody: `@${TAG}` });
		await run(deps);
		noCalls(deps);
	});

	test.each([...PRIVILEGED_ASSOCIATIONS])(
		"acts on a command from a %s",
		async (association: string) => {
			const deps: DepsMock = createDeps({ authorAssociation: association });
			await run(deps);
			expect(deps.api.review).toHaveBeenCalled();
		},
	);

	test.each(["CONTRIBUTOR", "FIRST_TIME_CONTRIBUTOR", "NONE", "MANNEQUIN", ""])(
		"refuses a command from a %s",
		async (association: string) => {
			// Nothing checked this before: anyone who could comment on a pull
			// request could have the bot approve it.
			const deps: DepsMock = createDeps({ authorAssociation: association });
			await run(deps);
			expect(deps.api.review).not.toHaveBeenCalled();
			expect(deps.api.react).toHaveBeenCalledWith(
				expect.objectContaining({ content: "confused" }),
			);
		},
	);

	test("refuses a command when the association is missing entirely", async () => {
		const deps: DepsMock = createDeps({ authorAssociation: undefined });
		await run(deps);
		expect(deps.api.review).not.toHaveBeenCalled();
		expect(loggedText(deps.log)).toContain("unknown");
	});

	test("the association check is case sensitive, as GitHub sends it", async () => {
		const deps: DepsMock = createDeps({ authorAssociation: "member" });
		await run(deps);
		expect(deps.api.review).not.toHaveBeenCalled();
	});

	test("checks the command before the caller's permission", async () => {
		// An unknown command from an outsider gets the same confused reaction
		// either way, and there is no point telling them which check they hit.
		const deps: DepsMock = createDeps({
			commentBody: `@${TAG} frobnicate`,
			authorAssociation: "NONE",
		});
		await run(deps);
		expect(loggedText(deps.log)).toContain("Command not found");
	});

	test("propagates a failure from the command it dispatched", async () => {
		// The action has to fail visibly; swallowing this is what made the old
		// unawaited calls invisible.
		const deps: DepsMock = createDeps();
		deps.api.review.mockRejectedValue(new Error("500 server error"));
		await expect(run(deps)).rejects.toThrow("500 server error");
	});

	test("propagates a failure from the confused reaction", async () => {
		const deps: DepsMock = createDeps({ commentBody: `@${TAG} frobnicate` });
		deps.api.react.mockRejectedValue(new Error("403 forbidden"));
		await expect(run(deps)).rejects.toThrow("403 forbidden");
	});

	test("logs the command and its arguments", async () => {
		const deps: DepsMock = createDeps({
			commentBody: `@${TAG} approve now please`,
		});
		await run(deps);
		const logged: string = loggedText(deps.log);
		expect(logged).toContain("approve");
		expect(logged).toContain("now,please");
	});

	test("resolves without a value on every path", async () => {
		for (const body of [
			`@${TAG} approve`,
			`@${TAG} frobnicate`,
			"unrelated",
			undefined,
		]) {
			await expect(
				run(createDeps({ commentBody: body })),
			).resolves.toBeUndefined();
		}
	});
});
