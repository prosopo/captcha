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
	getDetectorKeys: ReturnType<typeof vi.fn>;
	decryptSimdReadings: ReturnType<typeof vi.fn>;
};

const buildManager = (): FrictionlessManagerLike => ({
	getDetectorKeys: vi.fn().mockResolvedValue(["k1"]),
	decryptSimdReadings: vi.fn(),
});

describe("decryptIncomingSimdReadings", () => {
	let manager: FrictionlessManagerLike;

	beforeEach(() => {
		manager = buildManager();
	});

	it("returns undefined when no ciphertext is provided", async () => {
		const r = await decryptIncomingSimdReadings(manager as never, undefined);
		expect(r).toBeUndefined();
		expect(manager.decryptSimdReadings).not.toHaveBeenCalled();
	});

	it("returns undefined when decryption yields nothing", async () => {
		manager.decryptSimdReadings.mockResolvedValueOnce(undefined);
		const r = await decryptIncomingSimdReadings(manager as never, "blob");
		expect(r).toBeUndefined();
	});

	it("drops the inner replay-protection `timestamp` field", async () => {
		manager.decryptSimdReadings.mockResolvedValueOnce({
			timestamp: 12345,
			supported: true,
			ops: [{ name: "x", duration: 1 }],
		});
		const r = await decryptIncomingSimdReadings(manager as never, "blob");
		expect(r).toEqual({
			supported: true,
			ops: [{ name: "x", duration: 1 }],
		});
		expect((r as Record<string, unknown>)?.timestamp).toBeUndefined();
	});

	it("passes the detector keys plus the env fallback to decrypt", async () => {
		process.env.BOT_DECRYPTION_KEY = "envk";
		manager.decryptSimdReadings.mockResolvedValueOnce({ supported: true });
		await decryptIncomingSimdReadings(manager as never, "blob");
		expect(manager.decryptSimdReadings).toHaveBeenCalledWith("blob", [
			"k1",
			"envk",
		]);
		process.env.BOT_DECRYPTION_KEY = undefined;
	});
});
