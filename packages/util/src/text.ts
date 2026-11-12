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

// Reduce free text to its letters and digits, lower-cased, so two strings
// that differ only in punctuation, spacing, case, accents or full-width
// forms compare equal: "Example Hosting,Inc." and "Example Hosting , Inc."
// both become "examplehostinginc". NFKD plus dropping combining marks folds
// accents and full-width forms ("Ｔéléhost" → "telehost"). Letters from any
// script are kept, so non-Latin text still compares rather than collapsing
// to an empty string. Intended for matching operator-entered names against
// upstream data, not for display.
export const normaliseForMatching = (text: string): string =>
	text
		.normalize("NFKD")
		.replace(/\p{M}/gu, "")
		.toLowerCase()
		.replace(/[^\p{L}\p{N}]/gu, "");
