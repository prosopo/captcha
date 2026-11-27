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
	MAX_AUTO_ESCALATION_LEVEL,
	MAX_AUTO_ESCALATION_LEVEL_TOUCH,
	PUZZLE_DIFFICULTY_LEVELS,
} from "@prosopo/captcha-severity";
import type { ClientRecord, ProjectedSession } from "@prosopo/types-database";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock(
	"../../../../tasks/puzzle/puzzleRenderer.js",
	async (importOriginal) => {
		const actual =
			await importOriginal<
				typeof import("../../../../tasks/puzzle/puzzleRenderer.js")
			>();
		const renderPuzzleBoardImages: typeof actual.renderPuzzleBoardImages = vi
			.fn<typeof actual.renderPuzzleBoardImages>()
			.mockResolvedValue({
				background: "bg",
				mask: Buffer.alloc(4),
				pieceSize: 60,
				backgroundSeed: "seed",
				renderSeed: "seed",
				rendererVersion: 2,
			});
		return { ...actual, renderPuzzleBoardImages };
	},
);

import { issuePuzzleChallenge } from "../../../../api/captcha/getPuzzleCaptchaChallenge.js";
import type { ChallengeIssueContext } from "../../../../api/captcha/interactiveCaptchaChallenge.js";
import { getCompositeIpAddress } from "../../../../compositeIpAddress.js";
import type { Tasks } from "../../../../tasks/index.js";

const IPHONE_UA =
	"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const WINDOWS_CHROME_UA =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36";

const toleranceFloorAt = (level: number): number => {
	const band = PUZZLE_DIFFICULTY_LEVELS[level];
	if (!band) throw new Error(`no band at level ${level}`);
	return band.tolerance.min;
};

let getPuzzleCaptchaChallenge: ReturnType<typeof vi.fn>;

const issue = async (input: {
	userAgent: string;
	trafficTolerance?: number;
	sessionTolerance?: number;
	sitePuzzleMaxDifficulty?: number;
}): Promise<number | undefined> => {
	const context: ChallengeIssueContext = {
		tasks: {
			puzzleCaptchaManager: { getPuzzleCaptchaChallenge },
			db: {
				storePuzzleCaptchaRecord: vi.fn().mockResolvedValue(undefined),
				updatePuzzleCaptchaRecord: vi.fn().mockResolvedValue(undefined),
			},
			logger: { warn: vi.fn() },
			pair: { encodePkcs8: (): Uint8Array => new Uint8Array(32) },
		} as unknown as Tasks,
		user: "user",
		dapp: "5EjTA28bKSbFPPyMbUjNtArxyqjwq38r1BapVmLZShaqEedV",
		origin: "https://example.com",
		clientSettings: {
			settings: {
				...(input.sitePuzzleMaxDifficulty !== undefined && {
					puzzleMaxDifficulty: input.sitePuzzleMaxDifficulty,
				}),
			},
		} as unknown as ClientRecord,
		sessionRecord: {
			...(input.sessionTolerance !== undefined && {
				puzzleTolerance: input.sessionTolerance,
			}),
		} as unknown as ProjectedSession,
		trafficVerdict:
			input.trafficTolerance === undefined
				? { kind: "pass" }
				: {
						kind: "challenge",
						captchaType: undefined,
						puzzleTolerance: input.trafficTolerance,
						sourceCategories: ["proxy"],
					},
		provenance: {
			ipAddress: getCompositeIpAddress("203.0.113.5"),
			headers: {
				"user-agent": input.userAgent,
				"x-prosopo-bundle-version": "3.10.12",
			},
			ja4: "ja4",
			sessionId: "session",
			// No carrier signal, so the touch floors stay off and only the
			// ladder ceiling is in play.
			ipInfo: { isValid: true, isMobile: false } as never,
		},
	};
	await issuePuzzleChallenge(context);
	const call = getPuzzleCaptchaChallenge.mock.calls[0];
	if (!call) throw new Error("no challenge was minted");
	return call[3] as number | undefined;
};

describe("traffic-filter puzzle tolerance and the difficulty ladder", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getPuzzleCaptchaChallenge = vi.fn().mockResolvedValue({
			challenge: "challenge",
			requestedAtTimestamp: 0,
			targetX: 10,
			targetY: 10,
			originX: 0,
			originY: 0,
			tolerance: 10,
			providerSignature: "sig",
		});
	});

	it("raises a policy tolerance to the pointer ceiling", async () => {
		expect(
			await issue({ userAgent: WINDOWS_CHROME_UA, trafficTolerance: 6 }),
		).toBe(toleranceFloorAt(MAX_AUTO_ESCALATION_LEVEL));
	});

	it("raises a policy tolerance to the touch ceiling", async () => {
		expect(await issue({ userAgent: IPHONE_UA, trafficTolerance: 6 })).toBe(
			toleranceFloorAt(MAX_AUTO_ESCALATION_LEVEL_TOUCH),
		);
	});

	it("honours a site ceiling below the device ceiling", async () => {
		expect(
			await issue({
				userAgent: WINDOWS_CHROME_UA,
				trafficTolerance: 6,
				sitePuzzleMaxDifficulty: 1,
			}),
		).toBe(toleranceFloorAt(1));
	});

	it("passes a policy tolerance inside the ladder through unchanged", async () => {
		const tolerance = toleranceFloorAt(MAX_AUTO_ESCALATION_LEVEL) + 1;
		expect(
			await issue({
				userAgent: WINDOWS_CHROME_UA,
				trafficTolerance: tolerance,
			}),
		).toBe(tolerance);
	});

	it("leaves a tolerance the session already carries alone", async () => {
		expect(
			await issue({ userAgent: WINDOWS_CHROME_UA, sessionTolerance: 6 }),
		).toBe(6);
	});
});
