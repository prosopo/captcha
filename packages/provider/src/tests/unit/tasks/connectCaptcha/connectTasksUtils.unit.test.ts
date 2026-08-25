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

import { describe, expect, it } from "vitest";
import { validateConnectSolution } from "../../../../tasks/connectCaptcha/connectTasksUtils.js";

// 3x3, line of 3. `.` is an empty cell, digits are icon indices.
//   0 0 .
//   . . .
//   0 . 1
const BOARD = "00...." + "0.1";
const SIZE = 3;
const LINE = 3;

describe("validateConnectSolution", () => {
	it("accepts the move that completes the top row", () => {
		expect(validateConnectSolution(BOARD, SIZE, LINE, 6, 2)).toBe(true);
	});

	it("rejects a move that leaves no line", () => {
		expect(validateConnectSolution(BOARD, SIZE, LINE, 6, 4)).toBe(false);
	});

	it("rejects dropping onto an occupied cell", () => {
		expect(validateConnectSolution(BOARD, SIZE, LINE, 6, 0)).toBe(false);
	});

	it("rejects picking up an empty cell", () => {
		expect(validateConnectSolution(BOARD, SIZE, LINE, 3, 2)).toBe(false);
	});

	it("rejects a move built from tiles of different icons", () => {
		// Cell 8 holds icon 1; moving it into the row-0 gap makes 0,0,1.
		expect(validateConnectSolution(BOARD, SIZE, LINE, 8, 2)).toBe(false);
	});

	it("refuses indices outside the board rather than reading out of bounds", () => {
		expect(validateConnectSolution(BOARD, SIZE, LINE, -1, 2)).toBe(false);
		expect(validateConnectSolution(BOARD, SIZE, LINE, 0, 9999)).toBe(false);
		expect(validateConnectSolution(BOARD, SIZE, LINE, 6, -5)).toBe(false);
	});

	it("refuses non-integer indices", () => {
		expect(validateConnectSolution(BOARD, SIZE, LINE, 6.5, 2)).toBe(false);
		expect(validateConnectSolution(BOARD, SIZE, LINE, 6, Number.NaN)).toBe(
			false,
		);
	});

	it("accepts any move that completes a line, not just the intended one", () => {
		// Two spare tiles of icon 0 both finish the column. The generator never
		// emits a board like this, but if one ever reached a user, both answers
		// are visibly correct and the server must honour whichever they gave.
		//   0 . .
		//   0 . .
		//   . 0 0
		const ambiguous = "0..0...00";
		expect(validateConnectSolution(ambiguous, SIZE, LINE, 7, 6)).toBe(true);
		expect(validateConnectSolution(ambiguous, SIZE, LINE, 8, 6)).toBe(true);
	});
});
