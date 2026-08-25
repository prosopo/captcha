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

import type { AudioBuffer } from "./types.js";

const RIFF_HEADER_BYTES = 44;
const BITS_PER_SAMPLE = 16;
const CHANNELS = 1;
const PCM_FORMAT_TAG = 1;

/**
 * Encode to RIFF/WAVE, 16-bit signed PCM, mono.
 *
 * WAV is uncompressed, so this is the largest the payload will ever be:
 * at 16 kHz a five-second clip is ~160 KB, ~213 KB once base64'd into the
 * JSON response. That is a real cost and the obvious lever is a
 * compressed codec, which would cut it by an order of magnitude — but it
 * would also mean an encoder dependency in the provider and a codec
 * support matrix in the browser. WAV needs neither: every browser that
 * can play audio at all can play 16-bit PCM, with no decode ambiguity
 * and no chance of a codec artefact being mistaken for part of the
 * challenge.
 *
 * 16 kHz rather than the 8 kHz that would halve the size: /s/, /f/ and
 * /θ/ live between 4 and 8 kHz, and an 8 kHz clip (4 kHz Nyquist)
 * discards them entirely. That is precisely the information that
 * separates "six" from "five" from "three", so the extra bytes are
 * buying intelligibility on the three digits humans confuse most.
 */
export const encodeWav = (buffer: AudioBuffer): Buffer => {
	const { samples, sampleRate } = buffer;
	const dataBytes = samples.length * (BITS_PER_SAMPLE / 8);
	const out = Buffer.alloc(RIFF_HEADER_BYTES + dataBytes);

	const byteRate = (sampleRate * CHANNELS * BITS_PER_SAMPLE) / 8;
	const blockAlign = (CHANNELS * BITS_PER_SAMPLE) / 8;

	out.write("RIFF", 0, "ascii");
	out.writeUInt32LE(36 + dataBytes, 4);
	out.write("WAVE", 8, "ascii");

	out.write("fmt ", 12, "ascii");
	out.writeUInt32LE(16, 16); // PCM fmt chunk size
	out.writeUInt16LE(PCM_FORMAT_TAG, 20);
	out.writeUInt16LE(CHANNELS, 22);
	out.writeUInt32LE(sampleRate, 24);
	out.writeUInt32LE(byteRate, 28);
	out.writeUInt16LE(blockAlign, 32);
	out.writeUInt16LE(BITS_PER_SAMPLE, 34);

	out.write("data", 36, "ascii");
	out.writeUInt32LE(dataBytes, 40);

	for (let n = 0; n < samples.length; n++) {
		// Clamp before scaling: a sample fractionally over ±1 would wrap
		// to the opposite rail as a loud click rather than saturating.
		const clamped = Math.max(-1, Math.min(1, samples[n] ?? 0));
		// Symmetric scale by 0x7fff for both signs. Two's complement has
		// one more negative code than positive, so scaling negatives by
		// 0x8000 would use the full range — but then decoding is no
		// longer the exact inverse of encoding, and every round trip
		// accumulates a small asymmetric error. Giving up the single
		// most-negative code buys exact invertibility, which is what the
		// tests and any downstream analysis actually want.
		out.writeInt16LE(Math.round(clamped * 0x7fff), RIFF_HEADER_BYTES + n * 2);
	}

	return out;
};

export const toDataUri = (wav: Buffer): string =>
	`data:audio/wav;base64,${wav.toString("base64")}`;
