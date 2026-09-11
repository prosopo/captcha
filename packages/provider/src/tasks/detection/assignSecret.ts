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
 * Per-provider key for the client → bundle mapping in `assignDetectorBundle`.
 * Generated once and kept on the pool volume so a restart does not change the
 * mapping. Treat it as a credential.
 */

import { randomBytes } from "node:crypto";
import {
	chmodSync,
	mkdirSync,
	readFileSync,
	renameSync,
	writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

const SECRET_BYTES = 32;

/**
 * Dot-prefixed so a pool replace leaves it alone: `loadFromDir` and
 * `persistDetectorBundlePool` only touch `.js`/`.json`.
 */
const SECRET_FILENAME = ".assign-secret";

interface SecretLogger {
	info?: (msg: string, data?: Record<string, unknown>) => void;
	warn?: (msg: string, data?: Record<string, unknown>) => void;
}

let cached: { path: string; secret: Buffer } | null = null;

export function getAssignSecret(
	poolDir: string,
	logger: SecretLogger = {},
): Buffer {
	const path = join(poolDir, SECRET_FILENAME);
	if (cached && cached.path === path) {
		return cached.secret;
	}

	try {
		const existing = readFileSync(path);
		if (existing.length === SECRET_BYTES) {
			cached = { path, secret: existing };
			return existing;
		}
		logger.warn?.("assign secret has unexpected length, regenerating", {
			bytes: existing.length,
		});
	} catch {
		// Absent on first boot.
	}

	const secret = randomBytes(SECRET_BYTES);
	mkdirSync(dirname(path), { recursive: true });
	const tmp = `${path}.tmp`;
	writeFileSync(tmp, secret, { mode: 0o600 });
	chmodSync(tmp, 0o600);
	renameSync(tmp, path);
	logger.info?.("generated a new assign secret", { path });

	cached = { path, secret };
	return secret;
}

/** Test seam. */
export function resetAssignSecretCache(): void {
	cached = null;
}
