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

import { createDecipheriv, createHmac } from "node:crypto";
import { ApiParams } from "@prosopo/types";
import type { ClientRecord, ProjectedSession } from "@prosopo/types-database";
import { getIPAddress } from "@prosopo/util";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { renderPuzzleBoardImagesMock, renderPuzzleImagesMock } = vi.hoisted(
	() => ({
		renderPuzzleBoardImagesMock: vi.fn(),
		renderPuzzleImagesMock: vi.fn(),
	}),
);

vi.mock(
	"../../../../tasks/puzzle/puzzleRenderer.js",
	async (importOriginal) => {
		const actual =
			await importOriginal<
				typeof import("../../../../tasks/puzzle/puzzleRenderer.js")
			>();
		return {
			...actual,
			renderPuzzleBoardImages: renderPuzzleBoardImagesMock,
			renderPuzzleImages: renderPuzzleImagesMock,
		};
	},
);

import {
	issuePuzzleChallenge,
	widgetLiftsPieceFromBoard,
} from "../../../../api/captcha/getPuzzleCaptchaChallenge.js";
import type { ChallengeIssueContext } from "../../../../api/captcha/interactiveCaptchaChallenge.js";
import { getCompositeIpAddress } from "../../../../compositeIpAddress.js";
import type { Tasks } from "../../../../tasks/index.js";
import {
	networkPuzzleKey,
	puzzleKeySecret,
} from "../../../../tasks/puzzle/puzzleKey.js";

const CALLER_IP = "203.0.113.5";
const CHALLENGE = "1700000000000___user___dapp";
const MASK = Buffer.from([0, 128, 255, 255, 64, 0]);
const PAIR = { encodePkcs8: (): Uint8Array => new Uint8Array(32).fill(3) };

const buildContext = (widgetVersion = "3.10.12"): ChallengeIssueContext => ({
	tasks: {
		puzzleCaptchaManager: {
			getPuzzleCaptchaChallenge: vi.fn().mockResolvedValue({
				challenge: CHALLENGE,
				requestedAtTimestamp: 0,
				targetX: 200,
				targetY: 100,
				originX: 60,
				originY: 110,
				tolerance: 12,
				providerSignature: "sig",
			}),
		},
		db: {
			storePuzzleCaptchaRecord: vi.fn().mockResolvedValue(undefined),
			updatePuzzleCaptchaRecord: vi.fn().mockResolvedValue(undefined),
		},
		logger: { warn: vi.fn() },
		pair: PAIR,
	} as unknown as Tasks,
	user: "user",
	dapp: "dapp",
	origin: "https://example.com",
	clientSettings: { settings: {} } as unknown as ClientRecord,
	sessionRecord: {} as ProjectedSession,
	trafficVerdict: { kind: "pass" },
	provenance: {
		ipAddress: getCompositeIpAddress(CALLER_IP),
		headers: {
			"user-agent": "Mozilla/5.0 (X11; Linux x86_64)",
			"x-prosopo-bundle-version": widgetVersion,
		},
		ja4: "ja4",
		sessionId: "session",
	},
});

const unscramble = (scrambled: string): Buffer => {
	const key = createHmac(
		"sha256",
		networkPuzzleKey(getIPAddress(CALLER_IP), puzzleKeySecret(PAIR)),
	)
		.update(CHALLENGE)
		.digest();
	const decipher = createDecipheriv(
		"aes-128-ctr",
		key.subarray(0, 16),
		Buffer.concat([key.subarray(16, 24), Buffer.alloc(8)]),
	);
	return Buffer.concat([
		decipher.update(Buffer.from(scrambled, "base64")),
		decipher.final(),
	]);
};

describe("puzzle piece delivery", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		renderPuzzleBoardImagesMock.mockResolvedValue({
			background: "board-with-piece",
			mask: MASK,
			pieceSize: 60,
			backgroundSeed: "seed",
			renderSeed: "seed",
			rendererVersion: 2,
		});
		renderPuzzleImagesMock.mockResolvedValue({
			background: "board",
			piece: "piece",
			pieceSize: 60,
			backgroundSeed: "seed",
			renderSeed: "seed",
			rendererVersion: 2,
		});
	});

	it("draws the piece at its start and sends only its scrambled mask", async () => {
		const { response: served } = await issuePuzzleChallenge(buildContext());
		expect(served[ApiParams.piece]).toBeUndefined();
		expect(served[ApiParams.background]).toBe("board-with-piece");
		expect(renderPuzzleBoardImagesMock.mock.calls[0]?.[0].start).toEqual({
			x: 60,
			y: 110,
		});
		const scrambled = served[ApiParams.pieceMask];
		expect(scrambled).toBeDefined();
		expect(unscramble(scrambled ?? "")).toEqual(MASK);
		expect(served[ApiParams.pieceMaskCheck]).toMatch(/^[0-9a-f]{16}$/);
	});

	it("sends a widget released before board delivery a separate piece", async () => {
		const { response: served } = await issuePuzzleChallenge(
			buildContext("3.10.10"),
		);
		expect(renderPuzzleBoardImagesMock).not.toHaveBeenCalled();
		expect(served[ApiParams.piece]).toBe("piece");
		expect(served[ApiParams.background]).toBe("board");
		expect(served[ApiParams.pieceMask]).toBeUndefined();
	});
});

describe("widgetLiftsPieceFromBoard", () => {
	const lifts = (version?: string): boolean =>
		widgetLiftsPieceFromBoard(
			version === undefined ? {} : { "x-prosopo-bundle-version": version },
		);

	it("is true from the first board-lifting release on", () => {
		expect(lifts("3.10.12")).toBe(true);
		expect(lifts("3.10.13")).toBe(true);
		expect(lifts("3.11.0")).toBe(true);
		expect(lifts("4.0.0")).toBe(true);
	});

	it("is false for earlier releases", () => {
		expect(lifts("3.10.11")).toBe(false);
		expect(lifts("3.9.40")).toBe(false);
		expect(lifts("2.99.99")).toBe(false);
	});

	it("is false when the version is missing or unreadable", () => {
		expect(lifts()).toBe(false);
		expect(lifts("")).toBe(false);
		expect(lifts("dev")).toBe(false);
	});
});
