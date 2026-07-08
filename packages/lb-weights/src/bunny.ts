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
import { type Logger, LogLevel, getLogger } from "@prosopo/logger";
import { type BunnyZone, type WeightUpdate, bunnyZoneSchema } from "./types.js";

const DEFAULT_BASE_URL = "https://api.bunny.net";

export interface BunnyClientOptions {
	accessKey: string;
	baseUrl?: string;
	logger?: Logger;
	// injectable for testing; defaults to the global fetch
	fetchFn?: typeof fetch;
}

/**
 * Minimal Bunny DNS client scoped to reading a zone and setting record weights.
 */
export class BunnyDnsClient {
	private readonly accessKey: string;
	private readonly baseUrl: string;
	private readonly logger: Logger;
	private readonly fetchFn: typeof fetch;

	constructor(options: BunnyClientOptions) {
		this.accessKey = options.accessKey;
		this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
		this.logger =
			options.logger ?? getLogger(LogLevel.enum.info, "@prosopo/lb-weights");
		this.fetchFn = options.fetchFn ?? fetch;
	}

	private headers(): Record<string, string> {
		return {
			AccessKey: this.accessKey,
			Accept: "application/json",
			"Content-Type": "application/json",
		};
	}

	/** Read a single DNS zone including its records. */
	async getZone(zoneId: number): Promise<BunnyZone> {
		const url = `${this.baseUrl}/dnszone/${zoneId}`;
		const response = await this.fetchFn(url, {
			method: "GET",
			headers: this.headers(),
		});
		if (!response.ok) {
			throw new Error(
				`Failed to read zone ${zoneId}: ${response.status} ${response.statusText}`,
			);
		}
		const json: unknown = await response.json();
		return bunnyZoneSchema.parse(json);
	}

	/** Set the weight of a single record (upsert via Bunny's record endpoint). */
	async setWeight(
		zoneId: number,
		update: WeightUpdate,
	): Promise<void> {
		const url = `${this.baseUrl}/dnszone/${zoneId}/records/${update.recordId}`;
		const response = await this.fetchFn(url, {
			method: "POST",
			headers: this.headers(),
			body: JSON.stringify({ Weight: update.weight }),
		});
		if (!response.ok) {
			throw new Error(
				`Failed to set weight on record ${update.recordId}: ${response.status} ${response.statusText}`,
			);
		}
		this.logger.info(() => ({
			msg: "Set record weight",
			data: { zoneId, recordId: update.recordId, weight: update.weight },
		}));
	}

	/** Apply a batch of weight updates sequentially. */
	async setWeights(
		zoneId: number,
		updates: readonly WeightUpdate[],
	): Promise<void> {
		for (const update of updates) {
			await this.setWeight(zoneId, update);
		}
	}
}
