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
import { randomBytes } from "node:crypto";
import { MAX_PAD_BYTES } from "@prosopo/types";
import type { NextFunction, Request, Response } from "express";

const POOL = randomBytes(Math.ceil((MAX_PAD_BYTES * 3) / 4)).toString("base64");

const CHUNK_BYTES = 64 * 1024;

const KEY_ALPHABET =
	"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

const MIN_KEY_LENGTH = 3;
const MAX_KEY_LENGTH = 12;

type BodyMember = { key: string; encoded: string };

const clampPadBytes = (padBytes: number | undefined): number =>
	padBytes && padBytes > 0 ? Math.min(Math.floor(padBytes), MAX_PAD_BYTES) : 0;

const isPlainObject = (body: unknown): body is object =>
	typeof body === "object" && body !== null && !Array.isArray(body);

const bodyMembers = (body: object): BodyMember[] | undefined => {
	const serialised = JSON.stringify(body);
	if (serialised === undefined || !serialised.startsWith("{")) return undefined;
	const normalised: Record<string, unknown> = JSON.parse(serialised);
	return Object.entries(normalised).map(([key, value]) => ({
		key,
		encoded: `${JSON.stringify(key)}:${JSON.stringify(value)}`,
	}));
};

const randomKey = (taken: Set<string>): string => {
	for (;;) {
		const length =
			MIN_KEY_LENGTH +
			Math.floor(Math.random() * (MAX_KEY_LENGTH - MIN_KEY_LENGTH + 1));
		let key = "";
		for (let index = 0; index < length; index++) {
			key += KEY_ALPHABET.charAt(
				Math.floor(Math.random() * KEY_ALPHABET.length),
			);
		}
		if (!taken.has(key)) {
			taken.add(key);
			return key;
		}
	}
};

const partition = (total: number, parts: number): number[] => {
	const cuts = [0, total];
	for (let index = 1; index < parts; index++) {
		cuts.push(Math.floor(Math.random() * (total + 1)));
	}
	cuts.sort((a, b) => a - b);
	const sizes: number[] = [];
	for (let index = 1; index < cuts.length; index++) {
		sizes.push((cuts[index] ?? 0) - (cuts[index - 1] ?? 0));
	}
	return sizes;
};

const awaitDrain = (res: Response): Promise<boolean> =>
	new Promise<boolean>((resolve) => {
		const settle = (drained: boolean): void => {
			res.removeListener("drain", onDrain);
			res.removeListener("close", onClose);
			resolve(drained);
		};
		const onDrain = (): void => settle(true);
		const onClose = (): void => settle(false);
		res.once("drain", onDrain);
		res.once("close", onClose);
	});

const write = async (res: Response, chunk: string): Promise<boolean> => {
	if (res.writableEnded || res.destroyed) return false;
	return res.write(chunk) ? true : await awaitDrain(res);
};

const writePad = async (res: Response, size: number): Promise<boolean> => {
	const offset = Math.floor(Math.random() * (POOL.length - size + 1));
	for (let written = 0; written < size; written += CHUNK_BYTES) {
		const from = offset + written;
		const to = offset + Math.min(written + CHUNK_BYTES, size);
		if (!(await write(res, POOL.slice(from, to)))) return false;
	}
	return true;
};

const streamWithPad = async (
	res: Response,
	members: BodyMember[],
	total: number,
): Promise<void> => {
	const segments = Math.max(members.length, 1);
	const sizes = partition(total, segments);
	const taken = new Set(members.map((member) => member.key));

	res.setHeader("content-type", "application/json; charset=utf-8");

	let separator = "{";
	for (let index = 0; index < segments; index++) {
		if (!(await write(res, `${separator}"${randomKey(taken)}":"`))) return;
		if (!(await writePad(res, sizes[index] ?? 0))) return;
		const member = members[index];
		if (!(await write(res, member ? `",${member.encoded}` : '"'))) return;
		separator = ",";
	}
	if (!(await write(res, "}"))) return;
	res.end();
};

export const padResponseMiddleware = (
	_req: Request,
	res: Response,
	next: NextFunction,
): void => {
	const originalJson = res.json.bind(res);
	res.json = (body: object): Response => {
		const total = clampPadBytes(res.locals.padBytes);
		if (total === 0 || !isPlainObject(body)) return originalJson(body);
		const members = bodyMembers(body);
		if (members === undefined) return originalJson(body);

		const swallow = (): void => undefined;
		res.on("error", swallow);
		void streamWithPad(res, members, total)
			.catch(() => {
				if (!res.destroyed) res.destroy();
			})
			.finally(() => res.removeListener("error", swallow));
		return res;
	};
	next();
};
