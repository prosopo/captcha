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
import { createHmac } from "node:crypto";

/**
 * An opaque per-build string, e.g. for a chunk name that must not reveal what
 * the chunk holds.
 *
 * Derived from a seed (the package version unless `PROSOPO_BUILD_SEED` is set)
 * rather than drawn at random, so building the same source twice gives
 * byte-identical output. Keyed by the secret `PROSOPO_BUILD_TOKEN_KEY` so that
 * someone with the public source cannot predict it from the version number.
 */
export const buildToken = (
	name: string,
	byteLength: number,
	version: string,
	env: NodeJS.ProcessEnv = process.env,
): string =>
	createHmac("sha256", env.PROSOPO_BUILD_TOKEN_KEY ?? "")
		.update(`${env.PROSOPO_BUILD_SEED || version}\0${name}`)
		.digest()
		.subarray(0, byteLength)
		.toString("hex");
