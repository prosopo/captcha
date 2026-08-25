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

import { isWinningMove, parseBoard } from "@prosopo/connect-assets";

/**
 * Score a submitted move by replaying it against the board that was actually
 * served, rather than comparing it to the answer the generator had in mind.
 *
 * The generator guarantees exactly one winning move, so in practice the two
 * agree — but replaying is the honest check: if a board ever did admit a second
 * winning move, a user who found it has solved the challenge they were shown,
 * and refusing them would be a bug in our bookkeeping rather than a failure on
 * their part.
 *
 * `isWinningMove` range-checks both indices and rejects picking up an empty
 * cell or dropping onto an occupied one, so a hostile client cannot use this
 * to read out of bounds.
 */
export const validateConnectSolution = (
	board: string,
	boardSize: number,
	lineLength: number,
	sourceIndex: number,
	targetIndex: number,
): boolean =>
	isWinningMove(
		parseBoard(board),
		{ boardSize, lineLength },
		{ from: sourceIndex, to: targetIndex },
	);
