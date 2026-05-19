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

// Pipe-safe wire codec for SimdReadings. Shared across the catcher (browser
// SDK that produces the encoded form for solution submission) and the
// provider (decodes when persisting onto the session record). Pure functions
// only — no DOM, no Node-specific APIs.

import type {
	SimdOpCategory,
	SimdOpReadingRecord,
	SimdReadings,
} from "./detection.js";

const TOP_SEP = ";";
const OP_SEP = ",";
const FIELD_SEP = ":";

const SUPPORTED_PREFIX = "S";
const UNSUPPORTED_PREFIX = "U";

const VALID_CATEGORIES: readonly SimdOpCategory[] = [
	"FP",
	"INT",
	"BIT",
	"PERM",
];

const isCategory = (s: string): s is SimdOpCategory =>
	(VALID_CATEGORIES as readonly string[]).includes(s);

const fmtNs = (n: number): string => {
	if (!Number.isFinite(n)) return "0";
	return n.toFixed(4).replace(/\.?0+$/, "") || "0";
};

const sanitize = (s: string): string => s.replace(/[|;,:]/g, "_");

export const encodeSimdReadings = (readings: SimdReadings): string => {
	if (!readings.supported) {
		return `${UNSUPPORTED_PREFIX}${FIELD_SEP}${sanitize(readings.reason)}`;
	}
	const header = [
		`${SUPPORTED_PREFIX}${readings.schema}`,
		fmtNs(readings.timerResolutionMs),
		String(readings.runsPerOp),
		fmtNs(readings.durationMs),
	].join(TOP_SEP);

	const ops = readings.ops
		.map((op) =>
			[
				sanitize(op.name),
				op.category,
				fmtNs(op.bestNs),
				fmtNs(op.medianNs),
				String(op.iters),
				String(op.resultLane | 0),
			].join(FIELD_SEP),
		)
		.join(OP_SEP);

	return `${header}${TOP_SEP}${ops}`;
};

const parseOp = (raw: string): SimdOpReadingRecord | null => {
	const parts = raw.split(FIELD_SEP);
	if (parts.length !== 6) return null;
	const name = parts[0] ?? "";
	const categoryStr = parts[1] ?? "";
	const best = parts[2] ?? "";
	const median = parts[3] ?? "";
	const iters = parts[4] ?? "";
	const lane = parts[5] ?? "";
	if (!isCategory(categoryStr)) return null;
	const bestNs = Number(best);
	const medianNs = Number(median);
	const itersN = Number(iters);
	const laneN = Number(lane);
	if (
		!Number.isFinite(bestNs) ||
		!Number.isFinite(medianNs) ||
		!Number.isFinite(itersN) ||
		!Number.isFinite(laneN)
	) {
		return null;
	}
	return {
		name,
		category: categoryStr,
		bestNs,
		medianNs,
		iters: itersN | 0,
		resultLane: laneN | 0,
	};
};

export const decodeSimdReadings = (
	encoded: string | undefined,
): SimdReadings | undefined => {
	if (!encoded) return undefined;

	if (encoded.startsWith(`${UNSUPPORTED_PREFIX}${FIELD_SEP}`)) {
		return {
			supported: false,
			reason: encoded.slice(UNSUPPORTED_PREFIX.length + FIELD_SEP.length),
		};
	}

	const segments = encoded.split(TOP_SEP);
	if (segments.length < 5) return undefined;
	const head = segments[0] ?? "";
	if (!head.startsWith(SUPPORTED_PREFIX)) return undefined;
	const schema = Number(head.slice(SUPPORTED_PREFIX.length));
	if (!Number.isFinite(schema)) return undefined;

	const timerResolutionMs = Number(segments[1] ?? "");
	const runsPerOp = Number(segments[2] ?? "");
	const durationMs = Number(segments[3] ?? "");
	if (
		!Number.isFinite(timerResolutionMs) ||
		!Number.isFinite(runsPerOp) ||
		!Number.isFinite(durationMs)
	) {
		return undefined;
	}

	const opsRaw = segments.slice(4).join(TOP_SEP);
	const ops: SimdOpReadingRecord[] = [];
	if (opsRaw.length > 0) {
		for (const part of opsRaw.split(OP_SEP)) {
			const op = parseOp(part);
			if (op === null) return undefined;
			ops.push(op);
		}
	}

	return {
		supported: true,
		schema: schema | 0,
		timerResolutionMs,
		runsPerOp: runsPerOp | 0,
		durationMs,
		ops,
	};
};
