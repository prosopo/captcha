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
 * Keeps only the digits, in order: "1 2 3", "1-2-3" and screen-reader inserted
 * separators all grade the same, and no different digit sequence can pass.
 */
export const normaliseAudioAnswer = (raw: string): string =>
	raw.replace(/\D/g, "");

/**
 * Exact match after normalisation. No edit-distance slack: one substitution
 * widens the accepted set far more than it helps a listener, and a wrong
 * answer only costs a fresh challenge.
 */
export const validateAudioSolution = (
	submitted: string,
	expected: string,
): boolean => {
	const normalised = normaliseAudioAnswer(submitted);
	// Otherwise "" === "" would pass against a record with an empty answer.
	if (normalised.length === 0 || expected.length === 0) return false;
	return normalised === expected;
};
