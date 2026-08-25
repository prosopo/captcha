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

/**
 * Board layout for the connect captcha.
 *
 * THREAT MODEL. Unlike the slider puzzle, this is not a hidden-information
 * game: the client is shown every tile, so a determined solver can cluster the
 * tiles visually and compute the winning move. That is inherent to the format
 * (GeeTest's original has the same property — its icons are identifiable
 * straight off their sprite URLs) and is not what the challenge is defending.
 *
 * What it does buy:
 *   - a *human-plausible interaction* to measure. The drag trail, its timing,
 *     and the behavioural payload collected alongside it are the real signal,
 *     and they feed the decision machine exactly as the puzzle drag does.
 *   - per-challenge procedural tiles with per-tile jitter, so clustering needs
 *     actual image comparison rather than a hash lookup, and nothing is
 *     learnable across sessions.
 *   - single-use challenges inside a bounded submit window, so the work has to
 *     happen online, per request.
 *
 * Accordingly the generator optimises for a board a *human* can read quickly
 * and unambiguously, not for one a machine finds hard.
 */

import type { Prng } from "./prng.js";
import {
	type Board,
	type BoardGeometry,
	type BoardSettings,
	type ConnectBoard,
	EMPTY,
	type Move,
} from "./types.js";

export const DEFAULT_GEOMETRY: BoardGeometry = {
	boardSize: 5,
	lineLength: 5,
};

export const DEFAULT_BOARD_SETTINGS: BoardSettings = {
	iconCount: 4,
	decoyCount: 4,
	nearMissCount: 1,
};

/** Every window of `lineLength` cells that counts as a line, as flat indices. */
export const enumerateLines = (geometry: BoardGeometry): number[][] => {
	const { boardSize: n, lineLength: l } = geometry;
	if (l > n) return [];
	const at = (row: number, col: number): number => row * n + col;
	const lines: number[][] = [];
	const run = (
		row: number,
		col: number,
		deltaRow: number,
		deltaCol: number,
	): number[] =>
		Array.from({ length: l }, (_, i) =>
			at(row + deltaRow * i, col + deltaCol * i),
		);

	for (let row = 0; row < n; row++) {
		for (let col = 0; col + l <= n; col++) lines.push(run(row, col, 0, 1));
	}
	for (let col = 0; col < n; col++) {
		for (let row = 0; row + l <= n; row++) lines.push(run(row, col, 1, 0));
	}
	for (let row = 0; row + l <= n; row++) {
		for (let col = 0; col + l <= n; col++) lines.push(run(row, col, 1, 1));
		for (let col = l - 1; col < n; col++) lines.push(run(row, col, 1, -1));
	}
	return lines;
};

/** True when some line is entirely filled with one icon. */
export const hasLine = (board: Board, lines: readonly number[][]): boolean =>
	lines.some((line) => {
		const first = board[line[0] ?? -1];
		if (first === undefined || first === EMPTY) return false;
		return line.every((index) => board[index] === first);
	});

/**
 * Every single-tile move that completes a line. Used both to validate a
 * generated board and, at verify time, to score a submitted move — the
 * provider replays the move against the persisted board rather than trusting
 * a stored answer.
 */
export const winningMoves = (
	board: Board,
	lines: readonly number[][],
): Move[] => {
	const moves: Move[] = [];
	for (let from = 0; from < board.length; from++) {
		const icon = board[from];
		if (icon === undefined || icon === EMPTY) continue;
		for (let to = 0; to < board.length; to++) {
			if (board[to] !== EMPTY) continue;
			const next = [...board];
			next[from] = EMPTY;
			next[to] = icon;
			if (hasLine(next, lines)) moves.push({ from, to });
		}
	}
	return moves;
};

/** True when `move` turns `board` into a board containing a line. */
export const isWinningMove = (
	board: Board,
	geometry: BoardGeometry,
	move: Move,
): boolean => {
	const { from, to } = move;
	if (!Number.isInteger(from) || !Number.isInteger(to)) return false;
	if (from < 0 || from >= board.length) return false;
	if (to < 0 || to >= board.length) return false;
	const icon = board[from];
	if (icon === undefined || icon === EMPTY) return false;
	if (board[to] !== EMPTY) return false;
	const next = [...board];
	next[from] = EMPTY;
	next[to] = icon;
	return hasLine(next, enumerateLines(geometry));
};

const emptyIndices = (board: Board): number[] => {
	const out: number[] = [];
	for (let i = 0; i < board.length; i++) if (board[i] === EMPTY) out.push(i);
	return out;
};

/**
 * One attempt at a board. Returns null when the attempt produced an ambiguous
 * or already-won layout, which the caller retries.
 */
const attempt = (
	prng: Prng,
	geometry: BoardGeometry,
	settings: BoardSettings,
	lines: readonly number[][],
): ConnectBoard | null => {
	const { boardSize, lineLength } = geometry;
	const board: Board = new Array(boardSize * boardSize).fill(EMPTY);

	// The winning icon is always index 0. Which *glyph* that is varies per
	// challenge (the renderer shuffles families), so this is not a tell.
	const winningIcon = 0;
	const otherIcons = Array.from(
		{ length: Math.max(0, settings.iconCount - 1) },
		(_, i) => i + 1,
	);

	const target = prng.pick(lines);
	const gap = prng.pick(target);
	for (const index of target) {
		if (index !== gap) board[index] = winningIcon;
	}

	// The one loose winning tile. Must sit off the target line, or picking it
	// up would break the very line it is meant to complete.
	const spareCandidates = emptyIndices(board).filter(
		(index) => index !== gap && !target.includes(index),
	);
	if (spareCandidates.length === 0) return null;
	const spare = prng.pick(spareCandidates);
	board[spare] = winningIcon;

	const takeFreeCell = (): number | null => {
		const free = emptyIndices(board).filter((index) => index !== gap);
		return free.length === 0 ? null : prng.pick(free);
	};

	// Near misses: a partial run of a non-winning icon, short enough that no
	// single move can finish it. Purely to stop the eye landing on the answer
	// instantly.
	if (otherIcons.length > 0) {
		const runLength = lineLength - 2;
		for (let i = 0; i < settings.nearMissCount && runLength >= 2; i++) {
			const icon = prng.pick(otherIcons);
			const line = prng.pick(lines);
			const free = prng
				.shuffle(line)
				.filter((index) => index !== gap && board[index] === EMPTY)
				.slice(0, runLength);
			for (const index of free) board[index] = icon;
		}
	}

	for (let i = 0; i < settings.decoyCount; i++) {
		if (otherIcons.length === 0) break;
		const cell = takeFreeCell();
		if (cell === null) break;
		board[cell] = prng.pick(otherIcons);
	}

	// The board must not already be won, and the answer must be unambiguous.
	if (hasLine(board, lines)) return null;
	const moves = winningMoves(board, lines);
	if (moves.length !== 1) return null;
	const solution = moves[0];
	if (!solution || solution.to !== gap || solution.from !== spare) return null;

	return { ...geometry, board, solution };
};

const MAX_ATTEMPTS = 200;

/**
 * Generate a solvable board with exactly one winning move.
 *
 * Throws only if the geometry is unsatisfiable (`lineLength > boardSize`) or
 * if the settings leave no room to lay out a board, both of which are caller
 * bugs rather than bad luck — the retry budget is far beyond what a valid
 * configuration needs.
 */
export const generateBoard = (
	prng: Prng,
	geometry: BoardGeometry = DEFAULT_GEOMETRY,
	settings: BoardSettings = DEFAULT_BOARD_SETTINGS,
): ConnectBoard => {
	if (geometry.lineLength > geometry.boardSize) {
		throw new Error(
			`connect-assets: lineLength ${geometry.lineLength} exceeds boardSize ${geometry.boardSize}`,
		);
	}
	if (geometry.lineLength < 3) {
		throw new Error("connect-assets: lineLength must be at least 3");
	}
	const lines = enumerateLines(geometry);
	if (lines.length === 0) {
		throw new Error("connect-assets: geometry admits no lines");
	}
	for (let i = 0; i < MAX_ATTEMPTS; i++) {
		const board = attempt(prng, geometry, settings, lines);
		if (board) return board;
	}
	throw new Error(
		`connect-assets: could not generate a board in ${MAX_ATTEMPTS} attempts ` +
			`(boardSize ${geometry.boardSize}, lineLength ${geometry.lineLength}, ` +
			`icons ${settings.iconCount}, decoys ${settings.decoyCount})`,
	);
};

/**
 * Compact wire/storage form: one character per cell, `.` for empty and a
 * base-36 digit for an icon index. Round-trips through `parseBoard`.
 */
export const serialiseBoard = (board: Board): string =>
	board.map((icon) => (icon === EMPTY ? "." : icon.toString(36))).join("");

export const parseBoard = (serialised: string): Board =>
	[...serialised].map((char) =>
		char === "." ? EMPTY : Number.parseInt(char, 36),
	);
