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

import type { KeyringPair } from "@prosopo/types";
import type { ProsopoServerConfigOutput } from "@prosopo/types";
import type { Request, Response } from "express";
import type { Connection } from "mongoose";
import { vi } from "vitest";
import type { UserInterface } from "../models/user.js";

export const SITE_KEY = "site-key-address";
export const SECRET = "//Alice";
export const VERIFY_ENDPOINT = "https://api.prosopo.io/siteverify";

/** The subset of the config the controllers actually read. */
export const serverConfig = (
	options: { secret?: string } = { secret: SECRET },
): ProsopoServerConfigOutput =>
	({
		account: { secret: options.secret },
		defaultEnvironment: "development",
		serverUrl: "https://localhost:9228",
	}) as unknown as ProsopoServerConfigOutput;

/**
 * getPair returns a real keyring pair in production; the controllers only ever
 * compare `address` and hand the pair to ProsopoServer, so a stub with the
 * address is enough to drive every branch of the site-key matching.
 */
export const pairWithAddress = (address: string): KeyringPair =>
	({ address }) as unknown as KeyringPair;

export type FoundUser = Pick<UserInterface, "password" | "salt">;

export interface UserModelStub {
	findOne: ReturnType<typeof vi.fn>;
	create: ReturnType<typeof vi.fn>;
}

/**
 * A mongoose connection whose `model()` hands back a stub with the two methods
 * the controllers call. The real model would need a live mongod, and its
 * query builder is chainable in ways nothing here relies on.
 */
export const connectionWith = (
	model: UserModelStub,
): { connection: Connection; model: UserModelStub } => ({
	connection: {
		model: () => model,
	} as unknown as Connection,
	model,
});

export const userModel = (options: {
	found?: FoundUser | null;
	findOneRejects?: Error;
	createRejects?: Error;
}): UserModelStub => ({
	findOne: vi.fn(() =>
		options.findOneRejects
			? Promise.reject(options.findOneRejects)
			: Promise.resolve(options.found ?? null),
	),
	create: vi.fn(() =>
		options.createRejects
			? Promise.reject(options.createRejects)
			: Promise.resolve({}),
	),
});

export interface ResponseStub {
	response: Response;
	statuses: number[];
	bodies: unknown[];
}

/** Records what the handler wrote, in order, so double-sends are visible. */
export const responseStub = (): ResponseStub => {
	const statuses: number[] = [];
	const bodies: unknown[] = [];
	const response = {
		status: (code: number) => {
			statuses.push(code);
			return response;
		},
		json: (body: unknown) => {
			bodies.push(body);
			return response;
		},
	};
	return {
		response: response as unknown as Response,
		statuses,
		bodies,
	};
};

export const request = (options: {
	body?: Record<string, unknown>;
	headers?: Record<string, string>;
	authorization?: string;
}): Request =>
	({
		body: options.body ?? {},
		headers: options.headers ?? {},
		get: (name: string) =>
			name === "Authorization" ? options.authorization : undefined,
	}) as unknown as Request;

/** A body that satisfies SubscribeBodySpec. */
export const signupBody = (
	overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
	email: "user@example.com",
	password: "hunter2",
	name: "user",
	siteKey: SITE_KEY,
	"procaptcha-response": "0xtoken",
	...overrides,
});
