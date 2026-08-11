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

/** The name the bot answers to, as the first word of a comment. */
export const TAG = "prosoponator";

/**
 * The comment author's relationship to the repository, as GitHub reports it.
 *
 * Only the write-bearing values are acted on. Anything else — including
 * `CONTRIBUTOR`, which merely means the account has had a pull request merged
 * once — gets no say over whether a pull request is approved.
 */
export const PRIVILEGED_ASSOCIATIONS: ReadonlySet<string> = new Set([
	"OWNER",
	"MEMBER",
	"COLLABORATOR",
]);

/** The parts of an issue comment event the bot acts on. */
export interface CommentEvent {
	eventName: string;
	actor: string;
	repo: { owner: string; repo: string };
	commentId: number | undefined;
	issueNumber: number | undefined;
	commentBody: string | undefined;
	authorAssociation: string | undefined;
}

/** The octokit calls the bot makes. */
export interface GitHubApi {
	react: (input: {
		owner: string;
		repo: string;
		comment_id: number;
		content: "+1" | "confused";
	}) => Promise<unknown>;
	review: (input: {
		owner: string;
		repo: string;
		pull_number: number;
		event: "APPROVE" | "REQUEST_CHANGES";
		body: string;
	}) => Promise<unknown>;
	comment: (input: {
		owner: string;
		repo: string;
		issue_number: number;
		body: string;
	}) => Promise<unknown>;
}

export interface BotDeps {
	api: GitHubApi;
	event: CommentEvent;
	log: (...values: unknown[]) => void;
}

/**
 * The token, in the order the action's inputs take precedence.
 *
 * Returns undefined rather than "" when nothing is set. The empty string used
 * to be handed to `getOctokit` as though it were a token, so an unconfigured
 * action built an unauthenticated client and failed with a 401 on its first
 * write — after it had already reacted to the comment.
 */
export const resolveToken = (
	getInput: (name: string) => string,
	env: Record<string, string | undefined>,
): string | undefined => {
	// Each source is consulted only if the ones before it had nothing, so a
	// workflow that supplies the input never has its environment read.
	for (const read of [
		(): string | undefined => getInput("github-token"),
		(): string | undefined => env.GITHUB_TOKEN,
		(): string | undefined => env.GH_TOKEN,
	]) {
		const candidate = read();
		if (candidate !== undefined && candidate !== "") {
			return candidate;
		}
	}
	return undefined;
};

/** Read the event the action was triggered by out of the action's context. */
export const readCommentEvent = (): CommentEvent => {
	const payload = github.context.payload;
	return {
		eventName: github.context.eventName,
		actor: github.context.actor,
		repo: github.context.repo,
		commentId: payload.comment?.id,
		issueNumber: payload.issue?.number,
		commentBody: payload.comment?.body,
		authorAssociation: payload.comment?.author_association,
	};
};

/** Bind the octokit client down to the three calls the bot actually makes. */
export const createGitHubApi = (token: string): GitHubApi => {
	const octokit = github.getOctokit(token);
	return {
		react: octokit.rest.reactions.createForIssueComment,
		review: octokit.rest.pulls.createReview,
		comment: octokit.rest.issues.createComment,
	};
};

export const defaultDeps = (): BotDeps => {
	const token = resolveToken(core.getInput, process.env);
	if (token === undefined) {
		throw new Error(
			"no github token: set the github-token input, GITHUB_TOKEN or GH_TOKEN",
		);
	}
	return {
		api: createGitHubApi(token),
		event: readCommentEvent(),
		log: console.log,
	};
};

const requireCommentId = (event: CommentEvent): number => {
	// This used to fall back to -1, which GitHub answers with a 404 that the
	// bot then swallowed, so a malformed payload looked like a successful run.
	if (event.commentId === undefined) {
		throw new Error("event payload has no comment id");
	}
	return event.commentId;
};

const requireIssueNumber = (event: CommentEvent): number => {
	if (event.issueNumber === undefined) {
		throw new Error("event payload has no issue number");
	}
	return event.issueNumber;
};

const submitReview = async (
	deps: BotDeps,
	event: "APPROVE" | "REQUEST_CHANGES",
	verb: string,
): Promise<void> => {
	const { api, event: context, log } = deps;
	// The review goes first and the acknowledging reaction second. Neither used
	// to be awaited, so the process could exit before either landed, a rejected
	// request became an unhandled rejection rather than a failed run, and the
	// thumbs up appeared whether or not the review had been accepted.
	await api.review({
		...context.repo,
		pull_number: requireIssueNumber(context),
		event,
		body: `${verb} by @${context.actor}`,
	});
	log(`${verb} pull request`);
	await api.react({
		...context.repo,
		comment_id: requireCommentId(context),
		content: "+1",
	});
};

export const approve = (deps: BotDeps): Promise<void> =>
	submitReview(deps, "APPROVE", "Approved");

export const disapprove = (deps: BotDeps): Promise<void> =>
	submitReview(deps, "REQUEST_CHANGES", "Disapproved");

export const help = async (deps: BotDeps): Promise<void> => {
	await deps.api.comment({
		...deps.event.repo,
		issue_number: requireIssueNumber(deps.event),
		body: `My commands are: ${Object.keys(commands).sort().join(", ")}`,
	});
};

export const usage = async (deps: BotDeps): Promise<void> => {
	await deps.api.react({
		...deps.event.repo,
		comment_id: requireCommentId(deps.event),
		content: "confused",
	});
};

export const commands: Readonly<
	Record<string, (deps: BotDeps) => Promise<void>>
> = {
	disapprove,
	approve,
	help,
	accept: approve,
	reject: disapprove,
};

/**
 * The command of that name, if there is one.
 *
 * The name comes from a comment. Indexing `commands` with it — even behind a
 * hasOwnProperty guard — is a dynamic dispatch on attacker-controlled input, so
 * the mapping is spelled out instead: there is no name a commenter can write
 * that reaches anything but the five below. The test that walks `commands` and
 * asserts every key resolves here keeps the two from drifting apart.
 */
export const lookupCommand = (
	name: string,
): ((deps: BotDeps) => Promise<void>) | undefined => {
	switch (name) {
		case "approve":
		case "accept":
			return approve;
		case "disapprove":
		case "reject":
			return disapprove;
		case "help":
			return help;
		default:
			return undefined;
	}
};

/** A comment the bot was addressed in, once it has been understood. */
export interface ParsedCommand {
	command: string;
	args: string[];
}

/** Why a comment was not treated as a command. */
export interface NotACommand {
	reason: string;
}

/**
 * Pull the command out of a comment body, or explain why there is not one.
 *
 * The tag has to be the first word: a comment that merely mentions the bot in
 * passing is a conversation, not an instruction.
 */
export const parseCommand = (
	body: string | undefined,
): ParsedCommand | NotACommand => {
	if (body === undefined) {
		// A comment payload can arrive without a body — a deleted comment, or a
		// review comment event. This used to throw inside `split`.
		return { reason: "Comment has no body" };
	}
	// Split on any whitespace, not just " ": a command on its own line, or after
	// a newline, is the same instruction to a human reader.
	const words = body
		.split(/\s+/)
		.map((word: string) => word.trim())
		.filter((word: string) => word.length > 0);
	if (words.length === 0) {
		return { reason: "No words found in comment" };
	}
	if (words[0] !== `@${TAG}`) {
		return { reason: "Bot not tagged in comment" };
	}
	const command = words[1];
	if (command === undefined) {
		return { reason: "No command found in comment" };
	}
	return { command, args: words.slice(2) };
};

export const isParsedCommand = (
	parsed: ParsedCommand | NotACommand,
): parsed is ParsedCommand => "command" in parsed;

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export const run = async (deps: BotDeps): Promise<void> => {
	const { event, log } = deps;
	if (event.eventName !== "issue_comment") {
		log("This event is not a comment.");
		return;
	}

	const parsed = parseCommand(event.commentBody);
	if (!isParsedCommand(parsed)) {
		log(parsed.reason);
		return;
	}

	log("command", parsed.command);
	log("args", parsed.args);

	const fn = lookupCommand(parsed.command);
	if (fn === undefined) {
		log("Command not found");
		await usage(deps);
		return;
	}

	// The commands approve and reject pull requests, so who is asking matters.
	// Nothing checked this before: any account that could comment on a pull
	// request could have the bot approve it.
	if (!PRIVILEGED_ASSOCIATIONS.has(event.authorAssociation ?? "")) {
		log(`Ignoring command from ${event.authorAssociation ?? "unknown"}`);
		await usage(deps);
		return;
	}

	await fn(deps);
};

export const main = async (): Promise<void> => {
	try {
		await run(defaultDeps());
	} catch (error) {
		console.error(error);
		core.setFailed(error instanceof Error ? error.message : String(error));
	}
};
