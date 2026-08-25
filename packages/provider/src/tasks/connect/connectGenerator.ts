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
	type BoardGeometry,
	type BoardSettings,
	DEFAULT_BOARD_SETTINGS,
	DEFAULT_GEOMETRY,
	DEFAULT_RENDER_SETTINGS,
	type RenderedTile,
	createPrng,
	createSeed,
	generateBoard,
	parseBoard,
	renderBoard,
	serialiseBoard,
	toDataUri,
} from "@prosopo/connect-assets";
import type { Logger } from "@prosopo/logger";
import {
	ApiParams,
	CaptchaType,
	type ConnectTile,
	type IConnectSettings,
	connectBoardSizeDefault,
	connectDecoyCountDefault,
	connectIconCountDefault,
	connectLineLengthDefault,
	connectNearMissCountDefault,
} from "@prosopo/types";

export interface ResolvedConnectSettings {
	geometry: BoardGeometry;
	board: BoardSettings;
}

export interface GeneratedConnectBoard {
	/** Serialised board, one character per cell. Persisted on the record. */
	board: string;
	boardSize: number;
	lineLength: number;
	solutionSourceIndex: number;
	solutionTargetIndex: number;
	/** Carried through to the renderer so it knows how many icons to build. */
	iconCount: number;
}

export interface RenderedConnectTiles {
	tiles: ConnectTile[];
	tileSize: number;
}

/**
 * Merge zero or more partial-override sources on top of the asset package
 * defaults. Later sources win, matching the resolution order used for the
 * puzzle render settings: traffic-filter policy overrides the client-record
 * setting, which in turn overrides the built-in default.
 *
 * `lineLength > boardSize` is unsatisfiable and makes the generator throw. The
 * settings schema rejects that combination at save time, but a partial
 * override can still produce it — a client that set `lineLength: 5` and a
 * traffic category that then narrows `boardSize` to 4 are each valid alone.
 * Clamping here keeps a misconfiguration from taking the site's captcha down.
 */
export const resolveConnectSettings = (
	...overrides: (IConnectSettings | undefined)[]
): ResolvedConnectSettings => {
	let boardSize = connectBoardSizeDefault;
	let lineLength = connectLineLengthDefault;
	let iconCount = connectIconCountDefault;
	let decoyCount = connectDecoyCountDefault;
	let nearMissCount = connectNearMissCountDefault;

	for (const override of overrides) {
		if (!override) continue;
		if (override.boardSize !== undefined) boardSize = override.boardSize;
		if (override.lineLength !== undefined) lineLength = override.lineLength;
		if (override.iconCount !== undefined) iconCount = override.iconCount;
		if (override.decoyCount !== undefined) decoyCount = override.decoyCount;
		if (override.nearMissCount !== undefined) {
			nearMissCount = override.nearMissCount;
		}
	}

	if (lineLength > boardSize) lineLength = boardSize;

	return {
		geometry: { boardSize, lineLength },
		board: { iconCount, decoyCount, nearMissCount },
	};
};

/**
 * Lay out a board. Pure arithmetic — no imagery is produced here, so the
 * caller can persist the answer before committing it to pixels.
 */
export const generateConnectBoard = (
	settings: ResolvedConnectSettings = {
		geometry: DEFAULT_GEOMETRY,
		board: DEFAULT_BOARD_SETTINGS,
	},
): GeneratedConnectBoard => {
	const layout = generateBoard(
		createPrng(createSeed()),
		settings.geometry,
		settings.board,
	);
	return {
		board: serialiseBoard(layout.board),
		boardSize: layout.boardSize,
		lineLength: layout.lineLength,
		solutionSourceIndex: layout.solution.from,
		solutionTargetIndex: layout.solution.to,
		iconCount: settings.board.iconCount,
	};
};

/**
 * Render a previously generated board to per-cell tiles.
 *
 * Deliberately takes the serialised board rather than the layout object, so
 * the call site is forced to render from the value it actually persisted —
 * imagery that disagrees with the stored board would show the user a puzzle
 * the server cannot score.
 */
export const renderConnectTiles = async (
	board: string,
	geometry: BoardGeometry,
	iconCount: number,
): Promise<RenderedConnectTiles> => {
	const rendered = await renderBoard(
		parseBoard(board),
		geometry,
		DEFAULT_RENDER_SETTINGS,
		iconCount,
	);
	return {
		tiles: rendered.tiles.map((tile: RenderedTile) => ({
			[ApiParams.index]: tile.index,
			[ApiParams.image]: toDataUri(tile.webp),
		})),
		tileSize: rendered.tileSize,
	};
};

/**
 * Whether this provider can render connect imagery right now.
 *
 * Mirrors `isPuzzleRenderAvailable` — checked where a captchaType is *chosen*,
 * never where the challenge is served, because `/captcha/connect` cannot
 * answer with an image captcha and minting a connect session this provider
 * cannot fulfil would strand the user on INCORRECT_CAPTCHA_TYPE.
 */
export const isConnectRenderAvailable = (): boolean => {
	// Boards and tiles are synthesised in-process from nothing but a seed, so
	// unlike the detector pool there is no asset that can be missing.
	// Generation only fails if the image toolchain itself is broken, which
	// surfaces as a render error rather than as unavailability.
	return true;
};

/**
 * Substitute `image` for `connect` when this provider cannot render imagery.
 *
 * Call this at every point a session's captchaType is decided, never at the
 * point one is served. Returns other types untouched.
 */
export const downgradeConnectIfUnavailable = <T extends CaptchaType>(
	captchaType: T,
	logger?: Logger,
): T | CaptchaType.image => {
	if (captchaType !== CaptchaType.connect || isConnectRenderAvailable()) {
		return captchaType;
	}
	logger?.warn(() => ({
		msg: "Connect rendering unavailable - downgrading session to image",
		data: { requested: captchaType, served: CaptchaType.image },
	}));
	return CaptchaType.image;
};
