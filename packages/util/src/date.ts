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
 * Returns the start (first ms) and end (final ms) of the current calendar month,
 * in local time.
 */
export const getCurrentPeriod = (): { start: Date; end: Date } => {
	const now = new Date();
	const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
	const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
	// set to final millisecond of the day
	lastDayOfMonth.setHours(23, 59, 59, 999);
	return {
		start: firstDayOfMonth,
		end: lastDayOfMonth,
	};
};

export const getUTCDate = (date: Date) =>
	new Date(
		Date.UTC(
			date.getFullYear(),
			date.getMonth(),
			date.getDate(),
			date.getHours(),
			date.getMinutes(),
			date.getSeconds(),
			date.getMilliseconds(),
		),
	);
