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
import openpgp from "openpgp";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { encryptMessage } from "./encryptMessage.js";

// Generating a key pair is the slow part, so it happens once for the suite.
let publicKey = "";
let privateKey = "";

beforeAll(async () => {
	const generated = await openpgp.generateKey({
		type: "ecc",
		curve: "curve25519",
		userIDs: [{ name: "test", email: "test@example.com" }],
		format: "armored",
	});
	publicKey = generated.publicKey;
	privateKey = generated.privateKey;
}, 60000);

afterEach(() => {
	vi.restoreAllMocks();
});

const decrypt = async (armored: string): Promise<string> => {
	const key = await openpgp.readPrivateKey({ armoredKey: privateKey });
	const message = await openpgp.readMessage({ armoredMessage: armored });
	const { data } = await openpgp.decrypt({ message, decryptionKeys: key });
	return String(data);
};

describe("encryptMessage", () => {
	it("returns an armored pgp message", async () => {
		const encrypted = await encryptMessage("hello", [publicKey]);
		expect(String(encrypted)).toContain("BEGIN PGP MESSAGE");
	});

	it("produces a message the matching private key can read", async () => {
		const encrypted = await encryptMessage("hello", [publicKey]);
		expect(await decrypt(String(encrypted))).toBe("hello");
	});

	it("encrypts an empty message", async () => {
		const encrypted = await encryptMessage("", [publicKey]);
		expect(await decrypt(String(encrypted))).toBe("");
	});

	it("encrypts to several recipients at once", async () => {
		const other = await openpgp.generateKey({
			type: "ecc",
			curve: "curve25519",
			userIDs: [{ name: "other", email: "other@example.com" }],
			format: "armored",
		});
		const encrypted = await encryptMessage("hello", [
			publicKey,
			other.publicKey,
		]);
		expect(await decrypt(String(encrypted))).toBe("hello");
	}, 60000);

	it("normalises an escaped smart quote to an escaped double quote", async () => {
		const encrypted = await encryptMessage("a\\“b", [publicKey]);
		expect(await decrypt(String(encrypted))).toBe('a\\"b');
	});

	it("returns null when a key cannot be read", async () => {
		vi.spyOn(console, "error").mockImplementation((): void => undefined);
		expect(await encryptMessage("hello", ["not a key"])).toBeNull();
	});

	it("returns null when no keys are supplied", async () => {
		vi.spyOn(console, "error").mockImplementation((): void => undefined);
		expect(await encryptMessage("hello", [])).toBeNull();
	});

	it("logs a failure rather than throwing", async () => {
		const logged: string[] = [];
		vi.spyOn(console, "error").mockImplementation(
			(...args: unknown[]): void => {
				logged.push(args.map(String).join(" "));
			},
		);
		await encryptMessage("hello", ["not a key"]);
		expect(logged).toContain("danger Data encryption failed");
	});
});
