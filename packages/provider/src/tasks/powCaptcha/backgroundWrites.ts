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

/**
 * Lets writes finish after the response, but once `limit` are still pending
 * the caller waits for its own, so a slow database cannot pile them up.
 */
export class BackgroundWrites {
	private pending = 0;

	constructor(private readonly limit: number) {}

	async add(
		writes: Promise<unknown>,
		onError: (err: unknown) => void,
	): Promise<void> {
		const settled = writes.then(() => undefined, onError);
		if (this.pending >= this.limit) {
			await settled;
			return;
		}
		this.pending++;
		void settled.finally(() => {
			this.pending--;
		});
	}
}
