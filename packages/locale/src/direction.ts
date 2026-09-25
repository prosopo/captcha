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

export type TextDirection = "ltr" | "rtl";

// Scripts written right to left, by primary language subtag. Wider than the
// shipped catalogues so a site asking for e.g. "he" still gets a mirrored
// layout around whichever fallback text it is served.
const RTL_LANGUAGES: ReadonlySet<string> = new Set([
	"ar",
	"ckb",
	"dv",
	"fa",
	"he",
	"ps",
	"sd",
	"ug",
	"ur",
	"yi",
]);

export const getLanguageDirection = (language: string): TextDirection => {
	const primary = language.split(/[-_]/)[0]?.toLowerCase() ?? "";
	return RTL_LANGUAGES.has(primary) ? "rtl" : "ltr";
};
