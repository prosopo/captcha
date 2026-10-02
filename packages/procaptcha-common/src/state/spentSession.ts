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
 * Remembers the frictionless sessionId already exchanged for a challenge. The
 * provider consumes a session when it issues a challenge against it, so asking
 * again with the same id is a guaranteed CAPTCHA.NO_SESSION_FOUND. The id
 * lives on `frictionlessState`, which a manager's reset does not own, so every
 * path that re-enters `start()` would otherwise re-send it.
 */
export interface SpentSessionGuard {
	isSpent(sessionId: string | undefined): boolean;
	markSpent(sessionId: string | undefined): void;
}

export const createSpentSessionGuard = (): SpentSessionGuard => {
	let spentSessionId: string | undefined;
	return {
		isSpent: (sessionId: string | undefined) =>
			!!sessionId && sessionId === spentSessionId,
		markSpent: (sessionId: string | undefined) => {
			if (sessionId) spentSessionId = sessionId;
		},
	};
};
