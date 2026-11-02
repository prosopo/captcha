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
	buildFingerprintProofFromComponents,
	encodeFingerprintProof,
} from "@prosopo/fingerprint";
import { summariseFingerprintProof } from "@prosopo/fingerprint/summary";
import type { Logger } from "@prosopo/logger";
import {
	CaptchaType,
	type CounterSpec,
	encodeCounterKey,
} from "@prosopo/types";
import { describe, expect, it, vi } from "vitest";
import type { DecisionMachineRunner } from "../../../../tasks/decisionMachine/decisionMachineRunner.js";
import { applyRouter } from "../../../../tasks/frictionless/routingMachine.js";
import {
	type UsageCounters,
	buildAllWindowIncrements,
} from "../../../../util/usageCounters.js";

/**
 * The whole device-bucket path in one place: what fingerprintjs produces, what
 * the proof discloses, what gets stored, what the routing machine reads, and
 * what the solve hook writes.
 *
 * Each link is covered by its own package's tests. This asserts they join up,
 * and in particular that the Redis key the solve hook writes is byte-for-byte
 * the key the routing machine asks to have pre-fetched. Those are built in
 * different packages from different inputs, and nothing at runtime would
 * notice them drifting apart: the read would just always return 0.
 */

const DAPP = "5GCPkfsBFFVeaHJuLXWFX5Ry82QwGCh3rY2QCL2orPe6n94q";
const BUCKET = "9f1c3a0e7b2d4c6a8e0f1a2b3c4d5e6f";

/**
 * Structurally what fingerprintjs reports, rather than its `UnknownComponents`:
 * the provider does not depend on @prosopo/fingerprintjs, only on the
 * @prosopo/fingerprint wrapper around it.
 */
type Components = Record<string, { value: unknown; duration: number }>;

/** What fingerprintjs reports. `bucket` omitted stands in for an older client. */
const components = (bucket?: string): Components => ({
	colorDepth: { value: 24, duration: 1 },
	cookiesEnabled: { value: true, duration: 1 },
	sessionStorage: { value: true, duration: 1 },
	localStorage: { value: true, duration: 1 },
	timezone: { value: "Europe/London", duration: 1 },
	hardwareConcurrency: { value: 8, duration: 1 },
	languages: { value: [["en-GB"]], duration: 1 },
	architecture: { value: 127, duration: 1 },
	...(bucket !== undefined && {
		deviceBucket: { value: bucket, duration: 1 },
	}),
});

const SPEC: CounterSpec = {
	kind: "solved",
	captchaType: CaptchaType.pow,
	dimension: "deviceBucket",
	window: "24h",
};

const buildLogger = (): Logger =>
	({
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	}) as unknown as Logger;

describe("device bucket, fingerprintjs through to the routing machine", () => {
	const proof = encodeFingerprintProof(
		buildFingerprintProofFromComponents(components(BUCKET)),
	);

	it("carries the bucket from a component to a verified summary", () => {
		const summary = summariseFingerprintProof(proof);

		expect(summary?.bucketId).toBe(BUCKET);
	});

	it("discloses the bucket without disclosing what produced it", () => {
		// The point of hashing it client-side: the inputs never reach us.
		expect(proof).toContain(BUCKET);
		expect(proof).not.toContain("MacIntel");
	});

	it("reads the same Redis key the solve hook writes", async () => {
		const summary = summariseFingerprintProof(proof);
		if (!summary) throw new Error("expected the proof to summarise");

		const runner: Pick<DecisionMachineRunner, never> & {
			getRequiredCounters: ReturnType<typeof vi.fn>;
			route: ReturnType<typeof vi.fn>;
		} = {
			getRequiredCounters: vi.fn().mockResolvedValue([SPEC]),
			route: vi.fn().mockResolvedValue(undefined),
		};
		const counters = { batchGet: vi.fn().mockResolvedValue({}) };

		await applyRouter(
			runner as unknown as DecisionMachineRunner,
			counters as unknown as UsageCounters,
			{ captchaType: CaptchaType.pow },
			{
				dappAccount: DAPP,
				userAccount: "5Gy",
				ip: "1.2.3.4",
				score: 0.4,
				platform: { isApple: false, isWebView: false, isMobile: false },
				raw: {
					headers: {},
					userAgent: "Mozilla/5.0",
					fingerprintSummary: summary,
				},
			},
			buildLogger(),
			"postPow",
		);

		const call = counters.batchGet.mock.calls[0];
		if (!call) throw new Error("expected batchGet to be called");
		const reads = call[1] as Array<{ spec: CounterSpec; value: string }>;
		const readKeys = reads.map((r) => encodeCounterKey(DAPP, r.spec, r.value));

		const writeKeys = buildAllWindowIncrements(
			"solved",
			CaptchaType.pow,
			"1.2.3.4",
			"5Gy",
			undefined,
			summary.bucketId,
		).map((inc) => encodeCounterKey(DAPP, inc.spec, inc.value));

		expect(readKeys).toHaveLength(1);
		expect(writeKeys).toContain(readKeys[0]);
	});

	it("resolves no bucket from a proof that did not disclose one", () => {
		const summary = summariseFingerprintProof(
			encodeFingerprintProof(buildFingerprintProofFromComponents(components())),
		);

		expect(summary).toBeDefined();
		expect(summary?.bucketId).toBeUndefined();
	});
});
