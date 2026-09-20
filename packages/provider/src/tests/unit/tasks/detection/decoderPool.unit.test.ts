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

import { afterEach, describe, expect, it } from "vitest";
import {
	DECODERS,
	type DecoderName,
	decoderModuleUrl,
} from "../../../../tasks/detection/decoderModules.js";
import {
	decode,
	shutdownDecoderPool,
} from "../../../../tasks/detection/decoderPool.js";

// The real decoders, on input that cannot decode. What matters is not the
// value — we have no valid payload to hand — but that running off-thread is
// indistinguishable from running inline, failures included. That equivalence
// is the whole safety argument for the pool.
const UNDECODABLE: unknown[] = [
	"not-a-real-payload",
	"headhash",
	"key",
	"innerConfig",
	"payloadLayout",
	"keyMap",
];

const inline = async (decoder: DecoderName): Promise<string> => {
	const mod = (await import(decoderModuleUrl(decoder))) as {
		default: (...args: unknown[]) => Promise<unknown>;
	};
	try {
		return `resolved:${JSON.stringify(await mod.default(...UNDECODABLE))}`;
	} catch (err) {
		return `threw:${err instanceof Error ? err.message : String(err)}`;
	}
};

const viaPool = async (decoder: DecoderName): Promise<string> => {
	try {
		return `resolved:${JSON.stringify(await decode(decoder, UNDECODABLE))}`;
	} catch (err) {
		return `threw:${err instanceof Error ? err.message : String(err)}`;
	}
};

describe("decoder pool", () => {
	afterEach(async () => {
		await shutdownDecoderPool();
		// biome-ignore lint/performance/noDelete: the pool reads presence, not value
		delete process.env.PROSOPO_DECODER_WORKERS;
		// biome-ignore lint/performance/noDelete: the pool reads presence, not value
		delete process.env.PROSOPO_DECODER_TIMEOUT_MS;
	});

	it.each(DECODERS)(
		"gives the same answer as decoding inline (%s)",
		async (decoder) => {
			expect(await viaPool(decoder)).toBe(await inline(decoder));
		},
	);

	it("loads every decoder it claims to support", async () => {
		for (const decoder of DECODERS) {
			// A missing or unloadable module surfaces as a rejection whose
			// message names the module, not the payload.
			const outcome = await viaPool(decoder);
			expect(outcome).not.toMatch(/Cannot find module|ERR_MODULE_NOT_FOUND/);
		}
	});

	it("decodes inline when the pool is switched off", async () => {
		process.env.PROSOPO_DECODER_WORKERS = "0";
		expect(await viaPool("payload")).toBe(await inline("payload"));
	});

	it("survives concurrent calls across the pool", async () => {
		const expected = await inline("simd");
		const results = await Promise.all(
			Array.from({ length: 24 }, () => viaPool("simd")),
		);
		expect(results.every((r) => r === expected)).toBe(true);
	});

	it("rejects rather than hanging when a decode overruns", async () => {
		process.env.PROSOPO_DECODER_TIMEOUT_MS = "1";
		// One millisecond is shorter than a worker can start and answer in, so
		// this exercises the timeout path rather than a genuinely stuck decode.
		const outcome = await viaPool("behaviour");
		expect(outcome).toMatch(/threw:/);
	});
});
