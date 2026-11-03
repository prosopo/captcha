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
const RIFF_PREAMBLE_BYTES = 8;
const FMT_CHUNK_BYTES = 16;
const BITS_PER_SAMPLE = 16;
const BYTES_PER_SAMPLE = BITS_PER_SAMPLE / 8;
const CHANNELS = 1;
const PCM_FORMAT_TAG = 1;
// Symmetric for both signs so decoding is the exact inverse of encoding.
const INT16_SCALE = 0x7fff;

/**
 * Uncompressed WAV because every browser plays 16-bit PCM with no codec
 * dependency or artefacts that could be mistaken for the challenge.
 */
export const encodeWav = (buffer: AudioBuffer): Buffer => {
	const { samples, sampleRate } = buffer;
	const dataBytes = samples.length * BYTES_PER_SAMPLE;
	const out = Buffer.alloc(RIFF_HEADER_BYTES + dataBytes);

	out.write("RIFF", 0, "ascii");
	out.writeUInt32LE(RIFF_HEADER_BYTES - RIFF_PREAMBLE_BYTES + dataBytes, 4);
	out.write("WAVE", 8, "ascii");

	out.write("fmt ", 12, "ascii");
	out.writeUInt32LE(FMT_CHUNK_BYTES, 16);
	out.writeUInt16LE(PCM_FORMAT_TAG, 20);
	out.writeUInt16LE(CHANNELS, 22);
	out.writeUInt32LE(sampleRate, 24);
	out.writeUInt32LE(sampleRate * CHANNELS * BYTES_PER_SAMPLE, 28);
	out.writeUInt16LE(CHANNELS * BYTES_PER_SAMPLE, 32);
	out.writeUInt16LE(BITS_PER_SAMPLE, 34);

	out.write("data", 36, "ascii");
	out.writeUInt32LE(dataBytes, 40);

	for (let n = 0; n < samples.length; n++) {
		// Clamp first: an overshoot would otherwise wrap to the opposite rail.
		const clamped = Math.max(-1, Math.min(1, samples[n] ?? 0));
		out.writeInt16LE(
			Math.round(clamped * INT16_SCALE),
			RIFF_HEADER_BYTES + n * BYTES_PER_SAMPLE,
		);
	}

	return out;
};

export const toDataUri = (wav: Buffer): string =>
	`data:audio/wav;base64,${wav.toString("base64")}`;
