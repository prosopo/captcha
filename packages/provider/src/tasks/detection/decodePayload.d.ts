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

import type { DetectorResult } from "@prosopo/types";

// Hand-written to match decodeBehavior.d.ts and decodeSimd.d.ts, the other two
// obfuscated .js modules in this directory. Without it tsc emits a declaration
// for decodePayload.js into the source tree, and lint:license then trips on the
// generated file because it carries no licence header.
export default function getBotScoreFromPayload(
	payload: string,
	headHash: string,
	privateKeyString?: string,
	innerConfigEncoded?: string,
): Promise<DetectorResult>;
