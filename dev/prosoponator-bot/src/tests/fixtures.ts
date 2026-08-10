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

import { type Mock, vi } from "vitest";
import type { BotDeps, CommentEvent, GitHubApi } from "../bot.js";

export interface ApiMock extends GitHubApi {
	react: Mock<GitHubApi["react"]>;
	review: Mock<GitHubApi["review"]>;
	comment: Mock<GitHubApi["comment"]>;
}

export const createApiMock = (): ApiMock => ({
	react: vi.fn<GitHubApi["react"]>().mockResolvedValue(undefined),
	review: vi.fn<GitHubApi["review"]>().mockResolvedValue(undefined),
	comment: vi.fn<GitHubApi["comment"]>().mockResolvedValue(undefined),
});

export const createEvent = (
	overrides: Partial<CommentEvent> = {},
): CommentEvent => ({
	eventName: "issue_comment",
	actor: "someone",
	repo: { owner: "prosopo", repo: "captcha" },
	commentId: 101,
	issueNumber: 7,
	commentBody: "@prosoponator approve",
	authorAssociation: "MEMBER",
	...overrides,
});

export interface DepsMock extends BotDeps {
	api: ApiMock;
	log: Mock<(...values: unknown[]) => void>;
}

export const createDeps = (
	overrides: Partial<CommentEvent> = {},
	api: ApiMock = createApiMock(),
): DepsMock => ({
	api,
	event: createEvent(overrides),
	log: vi.fn<(...values: unknown[]) => void>(),
});

/** Everything the log was called with, flattened for substring assertions. */
export const loggedText = (log: Mock<(...values: unknown[]) => void>): string =>
	log.mock.calls.map((call: unknown[]) => call.join(" ")).join("\n");
