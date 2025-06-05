// Copyright 2021-2024 Prosopo (UK) Ltd.
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

async function disapprove(args: string[]) {
	console.log("disapprove");
	const token =
		core.getInput("github-token") ||
		process.env.GITHUB_TOKEN ||
		process.env.GH_TOKEN ||
		"";
	const octokit = github.getOctokit(token);
	console.log("reacting");
	octokit.rest.reactions.createForIssueComment({
		owner: github.context.repo.owner,
		repo: github.context.repo.repo,
		comment_id: github.context.payload.comment?.id || -1,
		content: "+1",
	});
	console.log("disapproving");
	octokit.rest.pulls.createReview({
		owner: github.context.repo.owner,
		repo: github.context.repo.repo,
		pull_number: github.context.payload.issue?.number || -1,
		event: "REQUEST_CHANGES",
		body: `Disapproved by @${github.context.actor}`,
	});
	console.log("done");
}

async function approve(args: string[]) {
	console.log("approve");
	const token =
		core.getInput("github-token") ||
		process.env.GITHUB_TOKEN ||
		process.env.GH_TOKEN ||
		"";
	const octokit = github.getOctokit(token);
	console.log("reacting");
	octokit.rest.reactions.createForIssueComment({
		owner: github.context.repo.owner,
		repo: github.context.repo.repo,
		comment_id: github.context.payload.comment?.id || -1,
		content: "+1",
	});
	console.log("approving");
	octokit.rest.pulls.createReview({
		owner: github.context.repo.owner,
		repo: github.context.repo.repo,
		pull_number: github.context.payload.issue?.number || -1,
		event: "APPROVE",
		body: `Approved by @${github.context.actor}`,
	});
	console.log("done");
}

async function help(args: string[]) {
	console.log("help");
	const token =
		core.getInput("github-token") ||
		process.env.GITHUB_TOKEN ||
		process.env.GH_TOKEN ||
		"";
	const octokit = github.getOctokit(token);
	octokit.rest.issues.createComment({
		owner: github.context.repo.owner,
		repo: github.context.repo.repo,
		issue_number: github.context.payload.issue?.number || -1,
		body: `My commands are: ${Object.keys(commands).sort().join(", ")}`,
	});
	console.log("done");
}

async function usage(args: string[]) {
	console.log("usage");
	const token =
		core.getInput("github-token") ||
		process.env.GITHUB_TOKEN ||
		process.env.GH_TOKEN ||
		"";
	const octokit = github.getOctokit(token);
	console.log("reacting");
	octokit.rest.reactions.createForIssueComment({
		owner: github.context.repo.owner,
		repo: github.context.repo.repo,
		comment_id: github.context.payload.comment?.id || -1,
		content: "confused",
	});
	console.log("done");
}

const commands: {
	[key: string]: (args: string[]) => Promise<void>;
} = {
	disapprove,
	approve,
	help,
	accept: approve,
	reject: disapprove,
};

const tag = "prosoponator";

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
async function run() {
	if (github.context.eventName !== "issue_comment") {
		console.log("This event is not a comment.");
		return;
	}

	const comment = github.context.payload.comment;
	if (!comment) {
		console.log("No comment found in payload");
		return;
	}

	const body = comment.body as string;
	const words = body
		.split(" ")
		.map((word) => word.trim())
		.filter((word) => word.length > 0);
	if (words.length === 0) {
		console.log("No words found in comment");
		return;
	}
	const target = words[0];
	if (target !== `@${tag}`) {
		console.log("Bot not tagged in comment");
		return;
	}
	const command = words[1];
	if (command === undefined) {
		console.log("No command found in comment");
		return;
	}
	const args = words.slice(2);
	console.log("command", command);
	console.log("args", args);

	const fn = commands[command];
	if (fn === undefined) {
		console.log("Command not found");
		await usage(args);
		return;
	}
	await fn(args);
}

run().catch((error) => {
	console.error(error);
	core.setFailed(error.message);
});
