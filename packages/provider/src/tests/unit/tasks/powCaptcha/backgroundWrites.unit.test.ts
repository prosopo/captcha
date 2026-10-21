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

import { describe, expect, it, vi } from "vitest";
import { BackgroundWrites } from "../../../../tasks/powCaptcha/backgroundWrites.js";

const never = (): Promise<void> => new Promise<void>(() => {});

const settledWithin = async (
	promise: Promise<void>,
	ms: number,
): Promise<boolean> =>
	Promise.race([
		promise.then(() => true),
		new Promise<boolean>((resolve) => setTimeout(() => resolve(false), ms)),
	]);

describe("BackgroundWrites", () => {
	it("returns without waiting while under the limit", async () => {
		const writes = new BackgroundWrites(2);
		const onError = vi.fn<(err: unknown) => void>();

		expect(await settledWithin(writes.add(never(), onError), 20)).toBe(true);
		expect(await settledWithin(writes.add(never(), onError), 20)).toBe(true);
	});

	it("waits for the caller's own write once the limit is pending", async () => {
		const writes = new BackgroundWrites(1);
		const onError = vi.fn<(err: unknown) => void>();
		await writes.add(never(), onError);

		let finish: () => void = () => {};
		const own = new Promise<void>((resolve) => {
			finish = resolve;
		});
		const added = writes.add(own, onError);

		expect(await settledWithin(added, 20)).toBe(false);
		finish();
		expect(await settledWithin(added, 20)).toBe(true);
	});

	it("frees a slot when a background write finishes", async () => {
		const writes = new BackgroundWrites(1);
		const onError = vi.fn<(err: unknown) => void>();
		await writes.add(Promise.resolve(), onError);
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(await settledWithin(writes.add(never(), onError), 20)).toBe(true);
	});

	it("reports a failed write without rejecting", async () => {
		const writes = new BackgroundWrites(1);
		const onError = vi.fn<(err: unknown) => void>();
		const err = new Error("write failed");

		await writes.add(Promise.reject(err), onError);
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(onError).toHaveBeenCalledWith(err);
	});
});
