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
import type { DetectorBundlePool, PoolBundle } from "./bundlePool.js";

/** Pool position for this caller: a keyed hash of their address. */
const clientIndex = (ip: string, secret: Buffer): number =>
	createHmac("sha256", secret).update(ip).digest().readUIntBE(0, 6);

/** The bundle a caller's address maps to under this provider's secret. */
export const bundleForClient = (
	pool: DetectorBundlePool,
	ip: string,
	secret: Buffer,
): { bundleId: string; bundle: PoolBundle } => pool.at(clientIndex(ip, secret));
