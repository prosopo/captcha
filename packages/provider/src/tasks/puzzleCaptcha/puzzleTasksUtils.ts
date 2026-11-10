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

/** Euclidean distance from where the piece was dropped to the target. */
export const puzzleDropDistance = (
	finalX: number,
	finalY: number,
	targetX: number,
	targetY: number,
): number => Math.sqrt((finalX - targetX) ** 2 + (finalY - targetY) ** 2);

/** Validate that the puzzle solution is within tolerance of the target. */
export const validatePuzzleSolution = ({
	finalX,
	finalY,
	targetX,
	targetY,
	tolerance,
}: {
	finalX: number;
	finalY: number;
	targetX: number;
	targetY: number;
	tolerance: number;
}): boolean => puzzleDropDistance(finalX, finalY, targetX, targetY) <= tolerance;

/** A wrong answer at least this far from the target is not a near miss. */
export const FAR_PUZZLE_MISS_DISTANCE = 50;

/** Whether a dropped piece landed at least [FAR_PUZZLE_MISS_DISTANCE] from the target. */
export const isFarPuzzleMiss = (
	finalX: number,
	finalY: number,
	targetX: number,
	targetY: number,
): boolean =>
	puzzleDropDistance(finalX, finalY, targetX, targetY) >=
	FAR_PUZZLE_MISS_DISTANCE;
