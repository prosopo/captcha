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

import type { Logger } from "@prosopo/common";
import type { BehavioralDataResult } from "./decodeBehavior.js";
import decryptBehavioralData from "./decodeBehavior.js";

export const getBehavioralData = async (
	encryptedData: string,
	privateKeys: (string | undefined)[],
	logger?: Logger,
): Promise<BehavioralDataResult | null> => {
	const decryptKeys = privateKeys.filter((k) => k);

	if (decryptKeys.length === 0) {
		logger?.error(() => ({
			msg: "No decryption keys provided",
		}));
		return null;
	}

	// Try each key until one succeeds
	for (const [keyIndex, key] of decryptKeys.entries()) {
		try {
			logger?.info(() => ({
				msg: "Attempting to decrypt behavioral data",
				data: {
					keyIndex: keyIndex + 1,
					totalKeys: decryptKeys.length,
				},
			}));

			const result = await decryptBehavioralData(encryptedData, key);

			logger?.info(() => ({
				msg: "Behavioral data decrypted successfully",
				data: {
					keyIndex: keyIndex + 1,
					collector1Count: result.collector1.length,
					collector2Count: result.collector2.length,
					collector3Count: result.collector3.length,
					deviceCapability: result.deviceCapability,
				},
			}));

			return result;
		} catch (error) {
			logger?.debug(() => ({
				msg: "Failed to decrypt with key, trying next",
				data: {
					keyIndex: keyIndex + 1,
					totalKeys: decryptKeys.length,
					err: error,
				},
			}));
			// Continue to next key
		}
	}

	// All keys failed
	logger?.error(() => ({
		msg: "Failed to decrypt behavioral data with all available keys",
		data: {
			totalKeysAttempted: decryptKeys.length,
		},
	}));
	return null;
};
