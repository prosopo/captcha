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

import type { Asn, City, ReaderModel } from "@maxmind/geoip2-node";
import type { Logger } from "@prosopo/common";
import type { IPInfoResponse, IPInfoResult } from "@prosopo/types";

export interface MaxMindBackendConfig {
	cityDbPath?: string;
	asnDbPath?: string;
	logger?: Logger;
}

export class MaxMindBackend {
	private cityReader: ReaderModel | null = null;
	private asnReader: ReaderModel | null = null;
	private config: MaxMindBackendConfig;

	constructor(config: MaxMindBackendConfig) {
		this.config = config;
	}

	async initialize(): Promise<void> {
		const { Reader } = await import("@maxmind/geoip2-node");

		if (this.config.cityDbPath) {
			try {
				this.cityReader = await Reader.open(this.config.cityDbPath);
				this.config.logger?.info(() => ({
					msg: "MaxMind City reader initialized",
					data: { dbPath: this.config.cityDbPath },
				}));
			} catch (error) {
				this.config.logger?.warn(() => ({
					msg: "Failed to initialize MaxMind City reader",
					err: error,
					data: { dbPath: this.config.cityDbPath },
				}));
			}
		}

		if (this.config.asnDbPath) {
			try {
				this.asnReader = await Reader.open(this.config.asnDbPath);
				this.config.logger?.info(() => ({
					msg: "MaxMind ASN reader initialized",
					data: { dbPath: this.config.asnDbPath },
				}));
			} catch (error) {
				this.config.logger?.warn(() => ({
					msg: "Failed to initialize MaxMind ASN reader",
					err: error,
					data: { dbPath: this.config.asnDbPath },
				}));
			}
		}
	}

	isAvailable(): boolean {
		return this.cityReader !== null || this.asnReader !== null;
	}

	async lookup(ip: string): Promise<IPInfoResponse> {
		if (!this.isAvailable()) {
			return {
				isValid: false,
				error: "MaxMind readers not initialized",
				ip,
			};
		}

		try {
			let cityData: City | undefined;
			let asnData: Asn | undefined;

			if (this.cityReader) {
				try {
					cityData = this.cityReader.city(ip);
				} catch (error) {
					this.config.logger?.debug(() => ({
						msg: "MaxMind City lookup failed",
						data: { ip },
						err: error,
					}));
				}
			}

			if (this.asnReader) {
				try {
					asnData = this.asnReader.asn(ip);
				} catch (error) {
					this.config.logger?.debug(() => ({
						msg: "MaxMind ASN lookup failed",
						data: { ip },
						err: error,
					}));
				}
			}

			if (!cityData && !asnData) {
				return {
					isValid: false,
					error: "No MaxMind data available for IP",
					ip,
				};
			}

			const result: IPInfoResult = {
				ip,
				isValid: true,

				// Threat indicators - GeoLite2 free DBs do not populate these
				isVPN: cityData?.traits?.isAnonymousVpn ?? false,
				isTor: cityData?.traits?.isTorExitNode ?? false,
				isProxy:
					(cityData?.traits?.isPublicProxy ?? false) ||
					(cityData?.traits?.isResidentialProxy ?? false),
				isDatacenter: cityData?.traits?.isHostingProvider ?? false,
				isAbuser: false,
				isMobile: false,
				isSatellite: cityData?.traits?.isSatelliteProvider ?? false,

				// Geolocation from City DB
				country: cityData?.country?.names?.en,
				countryCode: cityData?.country?.isoCode,
				region: cityData?.subdivisions?.[0]?.names?.en,
				city: cityData?.city?.names?.en,
				latitude: cityData?.location?.latitude,
				longitude: cityData?.location?.longitude,
				timezone: cityData?.location?.timeZone,

				// ASN info - prefer City DB traits, fall back to ASN DB
				asnNumber:
					cityData?.traits?.autonomousSystemNumber ??
					asnData?.autonomousSystemNumber,
				asnOrganization:
					cityData?.traits?.autonomousSystemOrganization ??
					asnData?.autonomousSystemOrganization,

				// Provider info from ASN
				providerName:
					cityData?.traits?.autonomousSystemOrganization ??
					asnData?.autonomousSystemOrganization,
				providerType: mapUserType(cityData?.traits?.userType),
			};

			return result;
		} catch (error) {
			return {
				isValid: false,
				error: `MaxMind lookup error: ${error instanceof Error ? error.message : String(error)}`,
				ip,
			};
		}
	}
}

type MaxMindUserType =
	| "business"
	| "cafe"
	| "cellular"
	| "college"
	| "consumer_privacy_network"
	| "content_delivery_network"
	| "dialup"
	| "government"
	| "hosting"
	| "library"
	| "military"
	| "residential"
	| "router"
	| "school"
	| "search_engine_spider"
	| "traveler";

type ProviderType =
	| "hosting"
	| "education"
	| "government"
	| "banking"
	| "business"
	| "isp";

function mapUserType(
	userType: MaxMindUserType | undefined,
): ProviderType | undefined {
	switch (userType) {
		case "hosting":
		case "content_delivery_network":
			return "hosting";
		case "college":
		case "school":
		case "library":
			return "education";
		case "government":
		case "military":
			return "government";
		case "business":
			return "business";
		case "residential":
		case "cellular":
		case "dialup":
		case "cafe":
		case "traveler":
		case "router":
			return "isp";
		default:
			return undefined;
	}
}
