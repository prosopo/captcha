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

import { createServer } from "node:net";
import { Agent } from "undici";

/**
 * Reserve a port the OS says is free, rather than guessing one.
 *
 * The suites need a port before the ProviderEnvironment is built (it goes into
 * the config and the base URL), so they cannot bind :0 on the real server and
 * read it back afterwards. Binding :0 on a throwaway socket gets the same
 * guarantee up front — the kernel avoids ports currently in use, including the
 * provider CI starts alongside the tests.
 */
export const reservePort = (): Promise<number> =>
	new Promise((resolve, reject) => {
		const probe = createServer();
		probe.once("error", reject);
		probe.listen(0, () => {
			const address = probe.address();
			if (typeof address !== "object" || address === null) {
				probe.close();
				reject(new Error("could not determine a free port"));
				return;
			}
			probe.close(() => resolve(address.port));
		});
	});

// Create an Agent that ignores certificate validation for integration tests
// This is needed because integration tests connect to https://localhost with self-signed certificates
export const httpsAgent =
	process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test"
		? new Agent({
				connect: {
					rejectUnauthorized: false,
				},
			})
		: undefined;

// Wrapper around fetch that automatically uses the HTTPS agent in dev/test
export async function testFetch(
	input: RequestInfo | URL,
	init?: RequestInit,
): Promise<Response> {
	return fetch(input, {
		...init,
		...(httpsAgent && { dispatcher: httpsAgent }),
	});
}
