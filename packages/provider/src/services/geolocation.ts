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
import type { ReaderModel } from "@maxmind/geoip2-node";

export interface GeolocationResult {
	countryCode?: string;
}

export class GeolocationService {
	private reader: ReaderModel | null = null;
	private initPromise: Promise<void> | null = null;
	private dbPath: string | undefined;
	private logger: Logger | undefined;

	constructor(dbPath?: string, logger?: Logger) {
		this.dbPath = dbPath;
		this.logger = logger;
	}

	/**
	 * Initialize the MaxMind Reader.
	 * This can be called at startup or will be lazy-initialized on first lookup.
	 */
	async initialize(): Promise<void> {
		if (this.reader) {
			return;
		}

		if (!this.dbPath) {
			this.logger?.debug(() => ({
				msg: "MaxMind database path not configured, geolocation will be disabled",
			}));
			return;
		}

		if (this.initPromise) {
			return this.initPromise;
		}

		this.initPromise = this.doInitialize();
		return this.initPromise;
	}

	private async doInitialize(): Promise<void> {
		try {
			const { Reader } = await import("@maxmind/geoip2-node");
			this.reader = await Reader.open(this.dbPath as string);
			this.logger?.info(() => ({
				msg: "MaxMind GeoIP2 Reader initialized",
				data: { dbPath: this.dbPath },
			}));
		} catch (error) {
			this.logger?.warn(() => ({
				msg: "Failed to initialize MaxMind GeoIP2 Reader",
				err: error,
				data: { dbPath: this.dbPath },
			}));
			// Continue without geolocation - permissive fallback
		}
	}

	/**
	 * Lookup the country code for an IP address.
	 * Returns undefined if lookup fails (permissive).
	 */
	async getCountryCode(ip: string): Promise<string | undefined> {
		// Lazy initialization if not already initialized
		await this.initialize();

		if (!this.reader) {
			return undefined;
		}

		try {
			const response = this.reader.country(ip);
			const countryCode = response.country?.isoCode;
			this.logger?.debug(() => ({
				msg: "Geolocation lookup successful",
				data: { ip, countryCode },
			}));
			return countryCode;
		} catch (error) {
			this.logger?.debug(() => ({
				msg: "Geolocation lookup failed",
				data: { ip },
				err: error,
			}));
			// Return undefined on failure - permissive behavior
			return undefined;
		}
	}

	/**
	 * Check if the geolocation service is available.
	 */
	isAvailable(): boolean {
		return this.reader !== null;
	}
}
