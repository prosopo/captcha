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

import { type Server, createServer } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { reservePort } from "./testUtils.js";

const open: Server[] = [];

const listenOn = (port: number): Promise<Server> =>
	new Promise((resolve, reject) => {
		const server = createServer();
		server.once("error", reject);
		server.listen(port, () => {
			open.push(server);
			resolve(server);
		});
	});

afterEach(async () => {
	await Promise.all(
		open.splice(0).map(
			(server) =>
				new Promise<void>((resolve) => {
					server.close(() => resolve());
				}),
		),
	);
});

describe("reservePort", () => {
	it("returns a port that is free to bind", async () => {
		const port = await reservePort();

		await expect(listenOn(port)).resolves.toBeDefined();
	});

	it("never hands out a port that is already in use", async () => {
		const taken = await reservePort();
		await listenOn(taken);

		const subsequent = await Promise.all(
			Array.from({ length: 20 }, () => reservePort()),
		);

		expect(subsequent).not.toContain(taken);
	});
});
