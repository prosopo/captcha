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
 * @see https://www.w3.org/TR/mediaqueries-5/#dynamic-range
 */
export default function isHDR(): boolean | undefined {
	if (doesMatch("high")) {
		return true;
	}
	if (doesMatch("standard")) {
		return false;
	}
	return undefined;
}

function doesMatch(value: string) {
	return matchMedia(`(dynamic-range: ${value})`).matches;
}
