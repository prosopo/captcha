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
 * Normalise a typed answer before comparison.
 *
 * Strips everything that is not a digit. People type "1 2 3 4 5",
 * "12345", "1-2-3-4-5" and "12 345" for the same heard sequence, and
 * failing any of those is a bug in the grader, not a wrong answer.
 * Assistive technology adds its own variations — some screen-reader
 * workflows insert separators the user never typed.
 *
 * This is deliberately narrower than a general trim: it cannot
 * accidentally admit a *different* digit sequence, because only the
 * digits survive and their order is preserved.
 */
export const normaliseAudioAnswer = (raw: string): string =>
	raw.replace(/\D/g, "");

/**
 * Grade a submitted answer against the stored transcript.
 *
 * Exact match after normalisation. No edit-distance tolerance: with a
 * five-digit answer, allowing one substitution would multiply the
 * accepted set by roughly 45×, taking a blind guess from 1-in-100,000 to
 * about 1-in-2,200. That is too much to give away for a class of
 * challenge that is already weak, and the failure path here is cheap —
 * a wrong answer issues a fresh challenge rather than costing the user
 * their session.
 */
export const validateAudioSolution = (
	submitted: string,
	expected: string,
): boolean => {
	const normalised = normaliseAudioAnswer(submitted);
	// Guard the empty case explicitly: a challenge record with an empty
	// `answer` should never exist, but if one did, "" === "" would pass
	// every submission that normalises to nothing.
	if (normalised.length === 0 || expected.length === 0) return false;
	return normalised === expected;
};
