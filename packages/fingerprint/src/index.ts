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

const FingerprintJSImport = async () =>
	(await import("@prosopo/fingerprintjs")).default;

let fingerprintCache: Promise<string> | null = null;

export const getFingerprint = async () => {
	if (!fingerprintCache) {
		fingerprintCache = (async () => {
			const FingerprintJS = await FingerprintJSImport();
			const fp = await FingerprintJS.load();
			const result = await fp.get();
			return result.visitorId;
		})();
	}
	return fingerprintCache;
};

/**
 * Pre-warms the fingerprint cache so getFingerprint() resolves immediately when called later.
 * Errors are silently ignored — getFingerprint() will retry on its next call.
 */
export const prefetchFingerprint = (): void => {
	getFingerprint().catch(() => {
		fingerprintCache = null;
	});
};
