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

// Generated from the Rust in packages/types/rust by `PROSOPO_WRITE_TS=1 cargo test -p prosopo-types
// generated_typescript_is_current`. Do not edit: change the Rust and generate it again.

import { z } from "zod";
import { boundedArray, safeText } from "../api/sanitise.js";
import { PowChallengeIdSchema } from "../datasets/captcha.js";

export const EnvironmentTypesSchema = z.enum([
	"development",
	"staging",
	"production",
]);

/**
 * Widget-controlled metadata sent alongside the captcha solution. `hp` is only
 * populated when the honeypot input has been filled in (which should only
 * happen for bots); `clientSessionId` is only populated when the site owner
 * rendered the widget with a session id. Server-side: persisted on the
 * StoredCaptcha record, no automatic verdict at submit time — the session
 * alignment check happens at verify. The TS shape (`ClientMetaData`) lives in
 * ./database.ts — this schema is the wire-level zod for request bodies.
 */
export const ClientMetaDataSchema = z.object({
	hp: safeText(16384).optional(),
	clientSessionId: z.string().max(256).optional(),
});

export const SubmitPowCaptchaSolutionBody = z.object({
	challenge: PowChallengeIdSchema,
	difficulty: z.number(),
	signature: z.object({
		user: z.object({
			timestamp: z.string().max(256),
		}),
		provider: z.object({
			challenge: z.string().max(131072),
		}),
	}),
	user: z.string().max(256),
	dapp: z.string().max(256),
	nonce: z.number(),
	behavioralData: z.string().max(131072).optional(),
	salt: z.string().max(256).optional(),
	simdReadings: z.string().max(131072).optional(),
	clientMetaData: ClientMetaDataSchema.optional(),
	fingerprintProof: z.string().max(131072).optional(),
});

/**
 * Event captured during a drag of the puzzle piece. `t` is milliseconds
 * since the drag started (not absolute), which is enough for behavioural
 * analysis and lets the trail be replay-portable.
 */
export const PuzzleEventSchema = z.object({
	x: z.number(),
	y: z.number(),
	t: z.number(),
});

export const SubmitPuzzleCaptchaSolutionBody = z.object({
	challenge: PowChallengeIdSchema,
	finalX: z.number(),
	finalY: z.number(),
	puzzleEvents: boundedArray(PuzzleEventSchema, 10000),
	signature: z.object({
		user: z.object({
			timestamp: z.string().max(256),
		}),
		provider: z.object({
			challenge: z.string().max(131072),
		}),
	}),
	user: z.string().max(256),
	dapp: z.string().max(256),
	behavioralData: z.string().max(131072).optional(),
	salt: z.string().max(256).optional(),
	simdReadings: z.string().max(131072).optional(),
	clientMetaData: ClientMetaDataSchema.optional(),
});

/** `t` is milliseconds since the challenge was issued. */
export const AudioEventSchema = z.object({
	kind: z.union([
		z.literal("play"),
		z.literal("pause"),
		z.literal("replay"),
		z.literal("key"),
	]),
	t: z.number(),
});

export const SubmitAudioCaptchaSolutionBody = z.object({
	challenge: PowChallengeIdSchema,
	answer: z.string().max(32),
	replays: z.number().int().min(0).max(1000).optional(),
	audioEvents: boundedArray(AudioEventSchema, 512).optional(),
	signature: z.object({
		user: z.object({
			timestamp: z.string().max(256),
		}),
		provider: z.object({
			challenge: z.string().max(131072),
		}),
	}),
	user: z.string().max(256),
	dapp: z.string().max(256),
	behavioralData: z.string().max(131072).optional(),
	salt: z.string().max(256).optional(),
	simdReadings: z.string().max(131072).optional(),
	clientMetaData: ClientMetaDataSchema.optional(),
});

/** One click in background pixels; its index in `clicks` is its order. */
export const IconClickSchema = z.object({
	x: z.number(),
	y: z.number(),
});

export const SubmitIconOrderCaptchaSolutionBody = z.object({
	challenge: PowChallengeIdSchema,
	clicks: boundedArray(IconClickSchema, 10),
	iconOrderEvents: boundedArray(PuzzleEventSchema, 10000),
	signature: z.object({
		user: z.object({
			timestamp: z.string().max(256),
		}),
		provider: z.object({
			challenge: z.string().max(131072),
		}),
	}),
	user: z.string().max(256),
	dapp: z.string().max(256),
	behavioralData: z.string().max(131072).optional(),
	salt: z.string().max(256).optional(),
	simdReadings: z.string().max(131072).optional(),
	clientMetaData: ClientMetaDataSchema.optional(),
});
