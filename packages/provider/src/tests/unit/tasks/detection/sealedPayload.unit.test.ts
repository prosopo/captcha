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

import {
	constants,
	createCipheriv,
	generateKeyPairSync,
	publicEncrypt,
	randomBytes,
} from "node:crypto";
import { copyFile, mkdtemp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
	generateInnerConfig,
	generateKeyMap,
	generatePayloadLayout,
	joinPayloadFields,
	sealPayload,
	toWireNames,
} from "@prosopo/native-bundle-payload";
import type { DetectorResult } from "@prosopo/types";
import { afterEach, describe, expect, it } from "vitest";
import { decoderModuleUrl } from "../../../../tasks/detection/decoderModules.js";
import {
	decode,
	shutdownDecoderPool,
} from "../../../../tasks/detection/decoderPool.js";

// A payload sealed the way a pool bundle seals it — inner frame, field layout
// and bag names all drawn per bundle — and then read back by the real,
// committed decodePayload.js. The decoder opens it with the same Rust the
// payload was sealed with here, through @prosopo/native-bundle-payload.

const { publicKey, privateKey } = generateKeyPairSync("rsa", {
	modulusLength: 2048,
	publicKeyEncoding: { type: "spki", format: "pem" },
	privateKeyEncoding: { type: "pkcs8", format: "pem" },
});
const privateKeyArg: string = Buffer.from(privateKey, "ascii").toString(
	"base64",
);

/** The browser's hybrid envelope around an already-sealed inner frame. */
const envelope = (frame: string): string => {
	const aesKey = randomBytes(32);
	const iv = randomBytes(12);
	const cipher = createCipheriv("aes-256-gcm", aesKey, iv);
	const data = Buffer.concat([
		cipher.update(frame, "utf8"),
		cipher.final(),
		cipher.getAuthTag(),
	]);
	const key = publicEncrypt(
		{
			key: publicKey,
			padding: constants.RSA_PKCS1_OAEP_PADDING,
			oaepHash: "sha256",
		},
		aesKey,
	);
	return JSON.stringify({
		key: key.toString("base64"),
		data: data.toString("base64"),
		iv: iv.toString("base64"),
	});
};

interface Bundle {
	innerConfigEncoded: string;
	payloadLayoutEncoded: string;
	keyMapEncoded: string;
}

const drawBundle = (): Bundle => ({
	innerConfigEncoded: generateInnerConfig(),
	payloadLayoutEncoded: generatePayloadLayout(),
	keyMapEncoded: generateKeyMap(["signal"]),
});

const USER_ID = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";

const decoderArgs = (bundle: Bundle, holder: Bundle = bundle): string[] => {
	const bag: string = Buffer.from(
		toWireNames(
			JSON.stringify({ signal: 7, unmapped: "kept" }),
			bundle.keyMapEncoded,
		),
	).toString("base64url");
	const wire: string = joinPayloadFields(
		[USER_ID, "42.5", "hashedUserAgent", "0", "1", "03", "0", bag],
		bundle.payloadLayoutEncoded,
	);
	const seal = (plaintext: string): string =>
		envelope(sealPayload(plaintext, bundle.innerConfigEncoded));
	return [
		seal(JSON.stringify([Date.now(), wire, 13837])),
		seal("headhash"),
		privateKeyArg,
		holder.innerConfigEncoded,
		holder.payloadLayoutEncoded,
		holder.keyMapEncoded,
	];
};

const expectDecoded = (result: DetectorResult): void => {
	expect(result.userId).toBe(USER_ID);
	expect(result.userAgent).toBe("hashedUserAgent");
	expect(result.isWebView).toBe(false);
	expect(result.isIframe).toBe(true);
	expect(result.decryptedHeadHash).toBe("headhash");
	expect(result.triggeredDetectors).toEqual([0, 1]);
	expect(Number.isFinite(result.score)).toBe(true);
	expect(result.d).toEqual({ signal: 7, unmapped: "kept" });
};

describe("sealed detector payload", () => {
	afterEach(async () => {
		await shutdownDecoderPool();
		// biome-ignore lint/performance/noDelete: the pool reads presence, not value
		delete process.env.PROSOPO_DECODER_WORKERS;
	});

	it("decodes on a decoder worker", async () => {
		expectDecoded(
			await decode<DetectorResult>("payload", decoderArgs(drawBundle())),
		);
	});

	it("decodes inline when the pool is switched off", async () => {
		process.env.PROSOPO_DECODER_WORKERS = "0";
		expectDecoded(
			await decode<DetectorResult>("payload", decoderArgs(drawBundle())),
		);
	});

	it("decodes on every worker at once", async () => {
		const results: DetectorResult[] = await Promise.all(
			Array.from({ length: 16 }, () =>
				decode<DetectorResult>("payload", decoderArgs(drawBundle())),
			),
		);
		for (const result of results) {
			expectDecoded(result);
		}
	});

	it("fails when the provider holds another bundle's config", async () => {
		await expect(
			decode<DetectorResult>(
				"payload",
				decoderArgs(drawBundle(), drawBundle()),
			),
		).rejects.toThrow(/authentication failed/);
	});

	it("loads the binary from beside the decoder where there is no node_modules, as in the cli bundle", async () => {
		const dir: string = await mkdtemp(path.join(tmpdir(), "decoder-bundle-"));
		try {
			const binary: string = path.join(
				path.dirname(
					createRequire(import.meta.url).resolve(
						"@prosopo/native-bundle-payload",
					),
				),
				"dist/native/prosopo-native-bundle-payload.linux-x64-gnu.node",
			);
			await copyFile(
				fileURLToPath(decoderModuleUrl("payload")),
				path.join(dir, "decodePayload.js"),
			);
			await copyFile(
				binary,
				path.join(dir, "prosopo-native-bundle-payload.node"),
			);
			const decoder = (await import(
				pathToFileURL(path.join(dir, "decodePayload.js")).href
			)) as { default: (...args: string[]) => Promise<DetectorResult> };

			expectDecoded(await decoder.default(...decoderArgs(drawBundle())));
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});
});
