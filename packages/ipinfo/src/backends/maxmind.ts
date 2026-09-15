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

import type { Asn, City, Country, ReaderModel } from "@maxmind/geoip2-node";
import type { Logger } from "@prosopo/logger";
import type { IPInfoResponse, IPInfoResult } from "@prosopo/types";

/**
 * Opens a MaxMind database file. Injected so tests can exercise initialisation
 * and lookup without shipping a .mmdb fixture, and so a failure to open one can
 * be simulated at all — the real Reader only fails on a genuinely bad file.
 */
export type OpenReader = (dbPath: string) => Promise<ReaderModel>;

const openReaderFromFile: OpenReader = async (
	dbPath: string,
): Promise<ReaderModel> => {
	// Imported lazily: the module pulls in native-ish decoding machinery that a
	// deployment without MaxMind databases should never pay for.
	const { Reader } = await import("@maxmind/geoip2-node");
	return Reader.open(dbPath);
};

export interface MaxMindBackendConfig {
	cityDbPath?: string;
	asnDbPath?: string;
	logger?: Logger;
	/** Overridden in tests; defaults to opening the file from disk. */
	openReader?: OpenReader;
}

/**
 * Which accessor the geo reader actually supports.
 *
 * `cityDbPath` is a path, not a promise of a City database — production points
 * it at GeoLite2-Country.mmdb. `Reader.open()` accepts any valid .mmdb, so the
 * reader opens and `isAvailable()` reports true, but `city()` checks
 * `metadata.databaseType` and throws `BadMethodCallError` on every call. The
 * result was a backend that claimed to be up and failed 100% of lookups —
 * invisible until the ipapi.is sidecar it was meant to back up went down.
 *
 * `metadata` is not on `ReaderModel`'s public type, so the kind is latched
 * lazily on the first `BadMethodCallError` rather than probed at open time.
 * "unknown" only ever costs one extra throw for the process lifetime.
 */
type GeoReaderKind = "unknown" | "city" | "country";

/** Thrown by geoip2-node when an accessor doesn't match the database type. */
const BAD_METHOD_CALL_ERROR = "BadMethodCallError";

export class MaxMindBackend {
	private cityReader: ReaderModel | null = null;
	private asnReader: ReaderModel | null = null;
	private geoReaderKind: GeoReaderKind = "unknown";
	private config: MaxMindBackendConfig;

	constructor(config: MaxMindBackendConfig) {
		this.config = config;
	}

	async initialize(): Promise<void> {
		const openReader: OpenReader = this.config.openReader ?? openReaderFromFile;

		if (this.config.cityDbPath) {
			try {
				this.cityReader = await openReader(this.config.cityDbPath);
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
				this.asnReader = await openReader(this.config.asnDbPath);
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

	/**
	 * ISO 3166-1 alpha-2 country code, or undefined when the reader has no
	 * answer. Synchronous and allocation-light: the .mmdb is memory-mapped, so
	 * this is a tree walk with no I/O and no network.
	 *
	 * Separate from `lookup()` because callers that only need the country
	 * should not pay for the ASN read, the threat-field assembly, or the
	 * `IPInfoResponse` object. The reader-kind latch is shared with `lookup()`
	 * — `country()` rejects a City database and `city()` rejects a Country one,
	 * so the accessor has to be chosen from the database's own metadata.
	 */
	countryCode(ip: string): string | undefined {
		if (!this.cityReader) return undefined;

		if (this.geoReaderKind !== "country") {
			try {
				const isoCode = this.cityReader.city(ip).country?.isoCode;
				this.geoReaderKind = "city";
				return isoCode;
			} catch (error) {
				if (!isBadMethodCall(error)) {
					// Address not in the database, or an invalid address: no
					// country, and nothing to latch.
					return undefined;
				}
				this.geoReaderKind = "country";
			}
		}

		try {
			return this.cityReader.country(ip).country?.isoCode;
		} catch {
			return undefined;
		}
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
			let countryData: Country | undefined;
			let asnData: Asn | undefined;

			if (this.cityReader) {
				if (this.geoReaderKind !== "country") {
					try {
						cityData = this.cityReader.city(ip);
						this.geoReaderKind = "city";
					} catch (error) {
						if (isBadMethodCall(error)) {
							// Not a City database. Latch so subsequent lookups go
							// straight to country() instead of paying the throw.
							this.geoReaderKind = "country";
							this.config.logger?.warn(() => ({
								msg: "MaxMind geo database is not a City database; falling back to country-level lookups",
								data: { dbPath: this.config.cityDbPath },
								err: error,
							}));
						} else {
							this.config.logger?.debug(() => ({
								msg: "MaxMind City lookup failed",
								data: { ip },
								err: error,
							}));
						}
					}
				}

				if (this.geoReaderKind === "country") {
					try {
						countryData = this.cityReader.country(ip);
					} catch (error) {
						this.config.logger?.debug(() => ({
							msg: "MaxMind Country lookup failed",
							data: { ip },
							err: error,
						}));
					}
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

			// `City extends Country`, so everything below the city/subdivision/
			// location fields reads off whichever one the database gave us.
			const geoData: City | Country | undefined = cityData ?? countryData;

			if (!geoData && !asnData) {
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
				isVPN: geoData?.traits?.isAnonymousVpn ?? false,
				isTor: geoData?.traits?.isTorExitNode ?? false,
				isProxy:
					(geoData?.traits?.isPublicProxy ?? false) ||
					(geoData?.traits?.isResidentialProxy ?? false),
				isDatacenter: geoData?.traits?.isHostingProvider ?? false,
				isAbuser: false,
				isMobile: false,
				isSatellite: geoData?.traits?.isSatelliteProvider ?? false,
				isCrawler: false,

				// Country is available from both database types; the rest needs a
				// City database and stays undefined on a Country-only one.
				country: geoData?.country?.names?.en,
				countryCode: geoData?.country?.isoCode,
				region: cityData?.subdivisions?.[0]?.names?.en,
				city: cityData?.city?.names?.en,
				latitude: cityData?.location?.latitude,
				longitude: cityData?.location?.longitude,
				timezone: cityData?.location?.timeZone,

				// ASN info - prefer geo DB traits, fall back to ASN DB
				asnNumber:
					geoData?.traits?.autonomousSystemNumber ??
					asnData?.autonomousSystemNumber,
				asnOrganization:
					geoData?.traits?.autonomousSystemOrganization ??
					asnData?.autonomousSystemOrganization,

				// Provider info from ASN
				providerName:
					geoData?.traits?.autonomousSystemOrganization ??
					asnData?.autonomousSystemOrganization,
				providerType: mapUserType(geoData?.traits?.userType),
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

/**
 * geoip2-node sets `name` on its error classes, so this survives the class
 * identity being lost across the lazy `import()` in `openReaderFromFile`.
 */
function isBadMethodCall(error: unknown): boolean {
	return error instanceof Error && error.name === BAD_METHOD_CALL_ERROR;
}

export type MaxMindUserType =
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
