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

export interface JwtReplayGuard {
	/**
	 * Record a token id. Returns false when the id was already recorded and has
	 * not yet expired, i.e. the token is being replayed.
	 */
	claim(id: string, expiresAtSeconds: number): boolean;
}

/**
 * Per-process set of token ids seen until their expiry. Only tokens signed by
 * an admin key reach it, so the size cap guards against a misbehaving issuer
 * rather than an attacker; when full the oldest entry is dropped.
 */
export const createMemoryJwtReplayGuard = (
	maxEntries = 10_000,
	nowSeconds: () => number = () => Date.now() / 1000,
): JwtReplayGuard => {
	const seen = new Map<string, number>();

	const sweep = (now: number): void => {
		for (const [id, exp] of seen) {
			if (exp < now) seen.delete(id);
		}
	};

	return {
		claim(id: string, expiresAtSeconds: number): boolean {
			const now = nowSeconds();
			const previous = seen.get(id);
			if (previous !== undefined && previous >= now) return false;
			if (seen.size >= maxEntries) {
				sweep(now);
				if (seen.size >= maxEntries) {
					const oldest = seen.keys().next();
					if (!oldest.done) seen.delete(oldest.value);
				}
			}
			seen.set(id, expiresAtSeconds);
			return true;
		},
	};
};
