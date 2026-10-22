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

import { constants, createDecipheriv, privateDecrypt } from "node:crypto";
import type { OpenDetectorPayload, OpenDetectorToken } from "@prosopo/types";
import { z } from "zod";
import {
	type DecodedDetectorPayload,
	sanitiseDetectorData,
} from "./getBotScore.js";

const AES_KEY_BYTES = 32;
const GCM_IV_BYTES = 12;
const GCM_TAG_BYTES = 16;

const OpenDetectorTokenSchema = z.object({
	v: z.literal(1),
	key: z.string(),
	iv: z.string(),
	data: z.string(),
}) satisfies z.ZodType<OpenDetectorToken>;

const OpenDetectorPayloadSchema = z.object({
	score: z.number().finite(),
	timestamp: z.number().finite(),
	userId: z.string(),
	userAgent: z.string(),
	headHash: z.string(),
	isWebView: z.boolean().optional(),
	isIframe: z.boolean().optional(),
	d: z.unknown().optional(),
}) satisfies z.ZodType<Omit<OpenDetectorPayload, "d"> & { d?: unknown }>;

/**
 * Decode a token from an open-format detector bundle. Throws on anything it
 * cannot read, which the caller treats exactly like an unreadable sealed
 * payload: decryption failed, so the visitor is challenged.
 *
 * The bundle's public key ships inside its JS, so a visitor can always mint a
 * token claiming any score. What this proves is that the token was produced
 * for this request: its head hash, user and user agent must match what the
 * widget sent, and the timestamp bounds how long it can be replayed.
 */
export const decodeOpenPayload = (
	token: string,
	headHash: string,
	privateKeyBase64: string,
): DecodedDetectorPayload => {
	const envelope = OpenDetectorTokenSchema.parse(JSON.parse(token));
	const aesKey = privateDecrypt(
		{
			key: Buffer.from(privateKeyBase64, "base64").toString("utf8"),
			padding: constants.RSA_PKCS1_OAEP_PADDING,
			oaepHash: "sha256",
		},
		Buffer.from(envelope.key, "base64"),
	);
	const iv = Buffer.from(envelope.iv, "base64");
	const sealed = Buffer.from(envelope.data, "base64");
	if (
		aesKey.length !== AES_KEY_BYTES ||
		iv.length !== GCM_IV_BYTES ||
		sealed.length <= GCM_TAG_BYTES
	) {
		throw new Error("malformed open detector token");
	}

	const decipher = createDecipheriv("aes-256-gcm", aesKey, iv, {
		authTagLength: GCM_TAG_BYTES,
	});
	decipher.setAuthTag(sealed.subarray(sealed.length - GCM_TAG_BYTES));
	const plaintext = Buffer.concat([
		decipher.update(sealed.subarray(0, sealed.length - GCM_TAG_BYTES)),
		decipher.final(),
	]).toString("utf8");

	const payload = OpenDetectorPayloadSchema.parse(JSON.parse(plaintext));
	if (!headHash || payload.headHash !== headHash) {
		throw new Error("open detector token was produced for another request");
	}

	return {
		baseBotScore: payload.score,
		timestamp: payload.timestamp,
		userId: payload.userId,
		userAgent: payload.userAgent,
		isWebView: payload.isWebView ?? false,
		isIframe: payload.isIframe ?? false,
		decryptedHeadHash: payload.headHash,
		d: sanitiseDetectorData(payload.d),
	};
};
