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

import { Session } from "node:inspector/promises";
import type { Logger } from "@prosopo/logger";

// A named span tells you what the code you already suspected costs. This tells
// you what you failed to suspect: V8's sampler attributes self time to every
// frame on the stack, so nothing has to be instrumented to show up.
//
// Off unless PROSOPO_CPU_PROFILE_ENABLED=true. Profiling is not free — the
// sampler interrupts the isolate at the configured interval — so this samples
// a short window periodically rather than running continuously.
const enabled = (): boolean =>
	process.env.PROSOPO_CPU_PROFILE_ENABLED === "true";

const numberFromEnv = (name: string, fallback: number): number => {
	const parsed = Number.parseInt(process.env[name] ?? "", 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

interface ProfileFrame {
	fn: string;
	url: string;
	line: number;
	selfMs: number;
	pct: number;
}

interface ProfileSummary {
	durationMs: number;
	samples: number;
	/** Wall time the sampler actually accounted for. */
	accountedMs: number;
	idlePct: number;
	top: ProfileFrame[];
}

// V8 reports these as ordinary frames. They are not our code and are more
// useful as a single headroom number than mixed into the ranking.
const SYNTHETIC_FRAMES = new Set(["(idle)", "(program)", "(root)"]);

/**
 * Collapse a CDP profile into self time per call frame.
 *
 * `timeDeltas[i]` is the gap between sample `i-1` and sample `i`, so charging
 * each delta to the node named by `samples[i]` gives self time — the time that
 * frame was on top of the stack, not the time spent beneath it.
 */
export const summariseProfile = (
	profile: {
		nodes: Array<{
			id: number;
			callFrame: {
				functionName: string;
				url: string;
				lineNumber: number;
			};
		}>;
		samples?: number[];
		timeDeltas?: number[];
		startTime: number;
		endTime: number;
	},
	topN: number,
): ProfileSummary => {
	const framesById = new Map(profile.nodes.map((node) => [node.id, node]));
	const samples = profile.samples ?? [];
	const timeDeltas = profile.timeDeltas ?? [];

	const selfMicros = new Map<number, number>();
	let accountedMicros = 0;
	for (let i = 0; i < samples.length; i++) {
		const id = samples[i];
		const delta = timeDeltas[i];
		if (id === undefined || delta === undefined || delta < 0) continue;
		selfMicros.set(id, (selfMicros.get(id) ?? 0) + delta);
		accountedMicros += delta;
	}

	let idleMicros = 0;
	const ranked: ProfileFrame[] = [];
	for (const [id, micros] of selfMicros) {
		const node = framesById.get(id);
		if (!node) continue;
		const { functionName, url, lineNumber } = node.callFrame;
		if (SYNTHETIC_FRAMES.has(functionName)) {
			idleMicros += micros;
			continue;
		}
		ranked.push({
			fn: functionName || "(anonymous)",
			url,
			line: lineNumber,
			selfMs: micros / 1000,
			pct: 0,
		});
	}

	ranked.sort((a, b) => b.selfMs - a.selfMs);
	const busyMs = Math.max(accountedMicros - idleMicros, 0) / 1000;
	for (const frame of ranked) {
		frame.pct = busyMs > 0 ? (frame.selfMs / busyMs) * 100 : 0;
	}

	return {
		durationMs: (profile.endTime - profile.startTime) / 1000,
		samples: samples.length,
		accountedMs: accountedMicros / 1000,
		idlePct: accountedMicros > 0 ? (idleMicros / accountedMicros) * 100 : 0,
		top: ranked.slice(0, topN),
	};
};

const runOnce = async (logger: Logger): Promise<void> => {
	const durationMs = numberFromEnv("PROSOPO_CPU_PROFILE_DURATION_MS", 5000);
	const samplingUs = numberFromEnv("PROSOPO_CPU_PROFILE_SAMPLING_US", 1000);
	const topN = numberFromEnv("PROSOPO_CPU_PROFILE_TOP_N", 25);

	const session = new Session();
	try {
		session.connect();
		await session.post("Profiler.enable");
		await session.post("Profiler.setSamplingInterval", {
			interval: samplingUs,
		});
		await session.post("Profiler.start");
		await new Promise((resolve) => setTimeout(resolve, durationMs));
		const { profile } = await session.post("Profiler.stop");

		const summary = summariseProfile(profile, topN);
		logger.info(() => ({
			msg: "CPU profile",
			data: {
				windowMs: summary.durationMs,
				samples: summary.samples,
				idlePct: Number(summary.idlePct.toFixed(1)),
				samplingUs,
				// One line per frame keeps this greppable in OpenObserve without
				// anyone having to pull a .cpuprofile off the box.
				top: summary.top.map((frame) => ({
					fn: frame.fn,
					at: `${frame.url}:${frame.line}`,
					selfMs: Number(frame.selfMs.toFixed(2)),
					pct: Number(frame.pct.toFixed(2)),
				})),
			},
		}));
	} finally {
		try {
			session.disconnect();
		} catch {
			// Disconnect throws if the session never connected. Nothing to do:
			// the profile is already logged or already lost.
		}
	}
};

/**
 * Sample the isolate for a window, log the ranked self time, repeat.
 *
 * Returns a stop function. Never throws into the caller and never keeps the
 * process alive: a broken profiler must not be able to take the provider with
 * it, and a provider that is otherwise idle must still be able to exit.
 */
export const startCpuProfiler = (logger: Logger): (() => void) => {
	if (!enabled()) return () => undefined;

	const intervalMs = numberFromEnv("PROSOPO_CPU_PROFILE_INTERVAL_MS", 900_000);
	let running = false;

	const tick = (): void => {
		if (running) return;
		running = true;
		runOnce(logger)
			.catch((err: unknown) => {
				logger.warn(() => ({ msg: "CPU profile failed", err }));
			})
			.finally(() => {
				running = false;
			});
	};

	logger.info(() => ({
		msg: "CPU profiler enabled",
		data: { intervalMs },
	}));

	const timer = setInterval(tick, intervalMs);
	timer.unref?.();
	return () => clearInterval(timer);
};
