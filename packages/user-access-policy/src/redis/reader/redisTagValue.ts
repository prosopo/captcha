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
 * Escapes a value for use inside a RediSearch TAG clause (`@field:{value}`).
 * Every ASCII character other than letters, digits and `_` is escaped, so a
 * request-supplied value can neither break the query syntax nor add clauses
 * of its own. Non-ASCII characters are left as-is: RediSearch treats an
 * escaped multi-byte character as a different token.
 */
export const escapeTagValue = (value: string): string =>
	value.replace(/[^\w\u0080-￿]/g, "\\$&");
