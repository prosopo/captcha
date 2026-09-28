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
 * Where the three obfuscated decoders live at runtime.
 *
 * They are loaded by URL rather than by import so that a worker thread can
 * load the same file the main thread would. A bundled dynamic import becomes a
 * content-hashed chunk whose name only the bundler knows, which a worker has
 * no way to ask for; a path the build guarantees is one both sides can
 * construct.
 *
 * Resolution works unchanged in both layouts because each is relative to this
 * module: from `dist/tasks/detection/` in development (tsc copies the .js
 * decoders through, `allowJs`), and from beside `provider.cli.bundle.js` in
 * production, where `copyAssetsPlugin` puts them under these exact names.
 */
export const DECODERS = ["payload", "simd", "behaviour"] as const;

export type DecoderName = (typeof DECODERS)[number];

const FILENAMES: Record<DecoderName, string> = {
	payload: "decodePayload.js",
	simd: "decodeSimd.js",
	behaviour: "decodeBehavior.js",
};

export const decoderModuleUrl = (decoder: DecoderName): string =>
	new URL(`./${FILENAMES[decoder]}`, import.meta.url).href;

export const decoderModuleUrls = (): Record<DecoderName, string> => ({
	payload: decoderModuleUrl("payload"),
	simd: decoderModuleUrl("simd"),
	behaviour: decoderModuleUrl("behaviour"),
});
