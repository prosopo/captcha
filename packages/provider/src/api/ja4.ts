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

import { createRequire } from "node:module";

// The Rust napi module ships two ways:
//   * In dev, resolvable as `@prosopo/native-ja4` via the workspace symlink.
//     Its index.js loader picks the right per-platform .node binary.
//   * In the cli bundle (@prosopo/cli), the `nodejsPolarsNativeFilePlugin`
//     copies the linux-x64 .node next to the bundle. The @prosopo/native-ja4
//     package name is not resolvable from the bundle location, so we fall
//     through to a direct require of the copied .node file.
type NativeJa4Module = { calculateJa4: (data: Buffer) => string };
const req = createRequire(import.meta.url);
const nativeJa4Module: NativeJa4Module = (() => {
	try {
		return req("@prosopo/native-ja4") as NativeJa4Module;
	} catch {
		return req("./index.linux-x64-gnu.node") as NativeJa4Module;
	}
})();
const nativeCalculateJa4 = nativeJa4Module.calculateJa4;

export class Ja4ParseError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "Ja4ParseError";
	}
}

/**
 * Compute a JA4 TLS fingerprint from raw ClientHello bytes.
 *
 * Delegates to the Rust implementation in @prosopo/native-ja4. Structural
 * TLS parse failures are rethrown as Ja4ParseError.
 */
export function calculateJa4(data: Buffer): string {
	try {
		return nativeCalculateJa4(data);
	} catch (err) {
		throw new Ja4ParseError(
			err instanceof Error ? err.message : String(err),
		);
	}
}
