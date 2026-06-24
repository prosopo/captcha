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

import { beforeEach, describe, expect, it, vi } from "vitest";
import { decryptIncomingSimdReadings } from "../../../../../api/captcha/getFrictionlessCaptchaChallenge/decryptSimdReadings.js";

type FrictionlessManagerLike = {
	resolveBundleByDetectorSession: ReturnType<typeof vi.fn>;
	decryptSimdReadings: ReturnType<typeof vi.fn>;
};

const buildManager = (): FrictionlessManagerLike => ({
	resolveBundleByDetectorSession: vi
		.fn()
		.mockResolvedValue({ key: "pk", innerConfig: "c" }),
	decryptSimdReadings: vi.fn(),
});

describe("decryptIncomingSimdReadings", () => {
	let manager: FrictionlessManagerLike;

	beforeEach(() => {
		manager = buildManager();
	});

	it("returns undefined when no ciphertext is provided", async () => {
		const r = await decryptIncomingSimdReadings(
			manager as never,
			undefined,
			"det-1",
		);
		expect(r).toBeUndefined();
		expect(manager.decryptSimdReadings).not.toHaveBeenCalled();
	});

	it("returns undefined when decryption yields nothing", async () => {
		manager.decryptSimdReadings.mockResolvedValueOnce(undefined);
		const r = await decryptIncomingSimdReadings(
			manager as never,
			"blob",
			"det-1",
		);
		expect(r).toBeUndefined();
	});

	it("drops the inner replay-protection `timestamp` field", async () => {
		manager.decryptSimdReadings.mockResolvedValueOnce({
			timestamp: 12345,
			supported: true,
			ops: [{ name: "x", duration: 1 }],
		});
		const r = await decryptIncomingSimdReadings(
			manager as never,
			"blob",
			"det-1",
		);
		expect(r).toEqual({
			supported: true,
			ops: [{ name: "x", duration: 1 }],
		});
		expect((r as Record<string, unknown>)?.timestamp).toBeUndefined();
	});

	it("resolves the session's bundle via detectorSessionId and decrypts with it", async () => {
		const bundle = { key: "pk", innerConfig: "c" };
		manager.resolveBundleByDetectorSession.mockResolvedValueOnce(bundle);
		manager.decryptSimdReadings.mockResolvedValueOnce({ supported: true });
		await decryptIncomingSimdReadings(manager as never, "blob", "det-1");
		expect(manager.resolveBundleByDetectorSession).toHaveBeenCalledWith(
			"det-1",
		);
		expect(manager.decryptSimdReadings).toHaveBeenCalledWith("blob", bundle);
	});
});
