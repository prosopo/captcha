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

export interface BehavioralDataResult {
	collector1: Array<Record<string, unknown>>;
	collector2: Array<Record<string, unknown>>;
	collector3: Array<Record<string, unknown>>;
	deviceCapability: string;
	timestamp: number;
}

export default function decryptBehavioralData(
	encryptedData: string,
	privateKeyString?: string,
): Promise<BehavioralDataResult>;
