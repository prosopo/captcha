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
 * Validate that the puzzle solution is within tolerance of the target.
 * Uses Euclidean distance.
 */
export const validatePuzzleSolution = (
	finalX: number,
	finalY: number,
	targetX: number,
	targetY: number,
	tolerance: number,
): boolean => {
	const distance = Math.sqrt((finalX - targetX) ** 2 + (finalY - targetY) ** 2);
	return distance <= tolerance;
};
