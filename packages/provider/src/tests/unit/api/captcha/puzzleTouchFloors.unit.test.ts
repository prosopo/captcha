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

// The per-device floors are applied at the point of issue because that is the
// only place every source of difficulty has resolved — the site's own setting,
// a traffic-filter policy, a routing machine's override and the ladder all
// converge here. These pin that they bite on each route and leave the pointer
// path alone.

import {
	TOUCH_MIN_PIECE_SCALE,
	TOUCH_MIN_TOLERANCE_PX,
} from "@prosopo/captcha-severity";
import { DEFAULT_GEOMETRY } from "@prosopo/puzzle-assets";
import type { IPuzzleSettings } from "@prosopo/types";
import type { ClientRecord, ProjectedSession } from "@prosopo/types-database";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { renderPuzzleImagesMock } = vi.hoisted(() => ({
	renderPuzzleImagesMock: vi.fn(),
}));

vi.mock(
	"../../../../tasks/puzzle/puzzleRenderer.js",
	async (importOriginal) => {
		const actual =
			await importOriginal<
				typeof import("../../../../tasks/puzzle/puzzleRenderer.js")
			>();
		return { ...actual, renderPuzzleImages: renderPuzzleImagesMock };
	},
);

import { issuePuzzleChallenge } from "../../../../api/captcha/getPuzzleCaptchaChallenge.js";
import type {
	ChallengeIssueContext,
	IssuedChallenge,
} from "../../../../api/captcha/interactiveCaptchaChallenge.js";
import type { RequestTimeTrafficVerdict } from "../../../../api/captcha/trafficFilterRequestTime.js";
import type { Tasks } from "../../../../tasks/index.js";

const IPHONE_UA =
	"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const WINDOWS_CHROME_UA =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36";

const SITE_KEY = "5EjTA28bKSbFPPyMbUjNtArxyqjwq38r1BapVmLZShaqEedV";

let getPuzzleCaptchaChallenge: ReturnType<typeof vi.fn>;

const buildTasks = (): Tasks =>
	({
		puzzleCaptchaManager: { getPuzzleCaptchaChallenge },
		db: {
			storePuzzleCaptchaRecord: vi.fn().mockResolvedValue(undefined),
			updatePuzzleCaptchaRecord: vi.fn().mockResolvedValue(undefined),
		},
		logger: { warn: vi.fn() },
	}) as unknown as Tasks;

const buildContext = (overrides: {
	userAgent: string;
	sitePuzzleTolerance?: number;
	sitePuzzle?: IPuzzleSettings;
	sessionPuzzle?: IPuzzleSettings;
	sessionPuzzleTolerance?: number;
	trafficVerdict?: RequestTimeTrafficVerdict;
}): ChallengeIssueContext => ({
	tasks: buildTasks(),
	user: "user",
	dapp: SITE_KEY,
	origin: "https://example.com",
	clientSettings: {
		settings: {
			...(overrides.sitePuzzleTolerance !== undefined && {
				puzzleTolerance: overrides.sitePuzzleTolerance,
			}),
			...(overrides.sitePuzzle && { puzzle: overrides.sitePuzzle }),
		},
	} as unknown as ClientRecord,
	sessionRecord: {
		...(overrides.sessionPuzzleTolerance !== undefined && {
			puzzleTolerance: overrides.sessionPuzzleTolerance,
		}),
		...(overrides.sessionPuzzle && { puzzle: overrides.sessionPuzzle }),
	} as unknown as ProjectedSession,
	trafficVerdict: overrides.trafficVerdict ?? { kind: "pass" },
	provenance: {
		ipAddress: { type: "v4", v4: 0 } as never,
		headers: { "user-agent": overrides.userAgent },
		ja4: "ja4",
		sessionId: "session",
	},
});

const issue = (
	overrides: Parameters<typeof buildContext>[0],
): Promise<IssuedChallenge<unknown>> =>
	issuePuzzleChallenge(buildContext(overrides));

/** The tolerance handed to the manager, which is what the challenge is cut to. */
const servedTolerance = (): number | undefined => {
	const call = getPuzzleCaptchaChallenge.mock.calls[0];
	if (!call) throw new Error("no challenge was minted");
	return call[3] as number | undefined;
};

/** The piece size in px handed to the renderer. */
const servedPieceSize = (): number => {
	const call = renderPuzzleImagesMock.mock.calls[0];
	if (!call) throw new Error("nothing was rendered");
	return call[2] as number;
};

const TOUCH_MIN_PIECE_PX = Math.round(
	DEFAULT_GEOMETRY.width * TOUCH_MIN_PIECE_SCALE,
);

describe("per-device puzzle floors at issuance", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getPuzzleCaptchaChallenge = vi.fn().mockResolvedValue({
			challenge: "challenge",
			requestedAtTimestamp: 0,
			targetX: 10,
			targetY: 10,
			originX: 0,
			originY: 0,
			tolerance: 12,
			providerSignature: "sig",
		});
		renderPuzzleImagesMock.mockResolvedValue({
			background: "bg",
			piece: "piece",
			pieceSize: 60,
			backgroundSeed: "seed",
			renderSeed: "seed",
		});
	});

	describe("tolerance", () => {
		it("raises a site setting a fingertip cannot hit", async () => {
			await issue({ userAgent: IPHONE_UA, sitePuzzleTolerance: 5 });
			expect(servedTolerance()).toBe(TOUCH_MIN_TOLERANCE_PX);
		});

		it("raises a traffic-filter override, which bypasses the ladder", async () => {
			await issue({
				userAgent: IPHONE_UA,
				sitePuzzleTolerance: 15,
				trafficVerdict: {
					kind: "challenge",
					captchaType: undefined,
					puzzleTolerance: 6,
					sourceCategories: ["proxy"],
				},
			});
			expect(servedTolerance()).toBe(TOUCH_MIN_TOLERANCE_PX);
		});

		it("raises a ladder value persisted on the session", async () => {
			await issue({ userAgent: IPHONE_UA, sessionPuzzleTolerance: 8 });
			expect(servedTolerance()).toBe(TOUCH_MIN_TOLERANCE_PX);
		});

		it("leaves a tolerance already above the floor alone", async () => {
			await issue({ userAgent: IPHONE_UA, sitePuzzleTolerance: 15 });
			expect(servedTolerance()).toBe(15);
		});

		it("does not ease the pointer path", async () => {
			await issue({ userAgent: WINDOWS_CHROME_UA, sitePuzzleTolerance: 5 });
			expect(servedTolerance()).toBe(5);
		});

		it("leaves the manager to apply its own default when nothing is set", async () => {
			await issue({ userAgent: IPHONE_UA });
			expect(servedTolerance()).toBeUndefined();
		});
	});

	describe("piece size", () => {
		it("raises a piece smaller than a fingertip", async () => {
			await issue({
				userAgent: IPHONE_UA,
				sitePuzzle: { pieceScale: { min: 0.1, max: 0.1 } },
			});
			expect(servedPieceSize()).toBe(TOUCH_MIN_PIECE_PX);
		});

		it("does not shrink a piece that is already big enough", async () => {
			await issue({
				userAgent: IPHONE_UA,
				sitePuzzle: { pieceScale: { min: 0.4, max: 0.4 } },
			});
			expect(servedPieceSize()).toBe(Math.round(DEFAULT_GEOMETRY.width * 0.4));
		});

		it("does not ease the pointer path", async () => {
			await issue({
				userAgent: WINDOWS_CHROME_UA,
				sitePuzzle: { pieceScale: { min: 0.1, max: 0.1 } },
			});
			expect(servedPieceSize()).toBe(Math.round(DEFAULT_GEOMETRY.width * 0.1));
		});

		it("never serves a touch device below the floor, whatever the band", async () => {
			for (const pieceScale of [
				{ min: 0.09, max: 0.22 },
				{ min: 0.1, max: 0.28 },
				{ min: 0.12, max: 0.34 },
				{ min: 0.15, max: 0.45 },
			]) {
				vi.clearAllMocks();
				await issue({
					userAgent: IPHONE_UA,
					sessionPuzzle: { pieceScale },
				});
				expect(servedPieceSize()).toBeGreaterThanOrEqual(TOUCH_MIN_PIECE_PX);
			}
		});
	});

	it("reports the mobile score so the floors can be calibrated", async () => {
		const issued = await issue({ userAgent: IPHONE_UA });
		expect(issued.logData.mobileScore).toBeGreaterThan(0);
	});
});
