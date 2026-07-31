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

// Testing strategy: the reader is the seam. Shipping a real .mmdb fixture would
// make these tests depend on MaxMind's data staying constant, and would leave
// the failure paths — a missing database, a corrupt one, an IP absent from it —
// impossible to reach at all. The reader is therefore injected, and everything
// the backend does with its output runs for real.

import type { Asn, City, ReaderModel } from "@maxmind/geoip2-node";
import type { IPInfoResult } from "@prosopo/types";
import { describe, expect, it, vi } from "vitest";
import { MaxMindBackend, type OpenReader } from "../backends/maxmind.js";

const IP = "8.8.8.8";
const CITY_DB = "/dbs/GeoLite2-City.mmdb";
const ASN_DB = "/dbs/GeoLite2-ASN.mmdb";

/** Builds a reader that answers city/asn lookups however the test needs. */
const reader = (behaviour: {
	city?: () => City;
	asn?: () => Asn;
}): ReaderModel => {
	const notSupported = (): never => {
		// The real Reader throws when asked for a database it did not open.
		throw new Error("database does not support this lookup");
	};
	return {
		city: behaviour.city ?? notSupported,
		asn: behaviour.asn ?? notSupported,
	} as unknown as ReaderModel;
};

const cityData = (overrides: Partial<City> = {}): City =>
	({
		country: { isoCode: "US", names: { en: "United States" } },
		city: { names: { en: "Mountain View" } },
		subdivisions: [{ names: { en: "California" } }],
		location: {
			latitude: 37.4,
			longitude: -122.1,
			timeZone: "America/Los_Angeles",
		},
		traits: {},
		...overrides,
	}) as City;

const asnData = (overrides: Partial<Asn> = {}): Asn =>
	({
		autonomousSystemNumber: 15169,
		autonomousSystemOrganization: "Google LLC",
		...overrides,
	}) as Asn;

/** An opener that returns the given reader for whichever path it is asked for. */
const opens = (readers: {
	city?: ReaderModel;
	asn?: ReaderModel;
}): OpenReader => {
	return async (dbPath: string): Promise<ReaderModel> => {
		const model = dbPath === CITY_DB ? readers.city : readers.asn;
		if (undefined === model) {
			throw new Error(`no database at ${dbPath}`);
		}
		return model;
	};
};

const expectValid = (
	response: Awaited<ReturnType<MaxMindBackend["lookup"]>>,
): IPInfoResult => {
	if (!response.isValid) {
		throw new Error(`expected a valid result, got: ${response.error}`);
	}
	return response;
};

describe("MaxMindBackend.initialize", () => {
	it("opens only the databases that are configured", async () => {
		const openReader = vi.fn<OpenReader>(
			opens({ city: reader({ city: () => cityData() }) }),
		);
		const backend = new MaxMindBackend({ cityDbPath: CITY_DB, openReader });

		await backend.initialize();

		expect(openReader).toHaveBeenCalledTimes(1);
		expect(openReader).toHaveBeenCalledWith(CITY_DB);
	});

	it("opens neither database when no paths are configured", async () => {
		const openReader = vi.fn<OpenReader>(opens({}));
		await new MaxMindBackend({ openReader }).initialize();

		expect(openReader).not.toHaveBeenCalled();
	});

	it("logs the readers it did open", async () => {
		const info = vi.fn();
		await new MaxMindBackend({
			cityDbPath: CITY_DB,
			asnDbPath: ASN_DB,
			openReader: opens({
				city: reader({ city: () => cityData() }),
				asn: reader({ asn: () => asnData() }),
			}),
			logger: { info, warn: vi.fn(), debug: vi.fn() } as never,
		}).initialize();

		const messages = info.mock.calls.map(
			(call: unknown[]): string => (call[0] as () => { msg: string })().msg,
		);
		expect(messages).toEqual([
			"MaxMind City reader initialized",
			"MaxMind ASN reader initialized",
		]);
	});

	it("keeps the ASN database when the City database fails to open", async () => {
		// Deployments routinely ship one and not the other. A failure to open one
		// must not take the other down with it.
		const backend = new MaxMindBackend({
			cityDbPath: CITY_DB,
			asnDbPath: ASN_DB,
			openReader: opens({ asn: reader({ asn: () => asnData() }) }),
		});

		await backend.initialize();

		expect(backend.isAvailable()).toBe(true);
	});

	it("does not throw when every database fails to open", async () => {
		// A missing .mmdb is a deployment mistake, but it must degrade to an
		// unavailable backend rather than crash the process at startup.
		const backend = new MaxMindBackend({
			cityDbPath: CITY_DB,
			asnDbPath: ASN_DB,
			openReader: opens({}),
		});

		await expect(backend.initialize()).resolves.toBeUndefined();
		expect(backend.isAvailable()).toBe(false);
	});

	it("logs a warning for each database it could not open", async () => {
		const warn = vi.fn();
		const backend = new MaxMindBackend({
			cityDbPath: CITY_DB,
			asnDbPath: ASN_DB,
			openReader: opens({}),
			logger: { warn, info: vi.fn(), debug: vi.fn() } as never,
		});

		await backend.initialize();

		expect(warn).toHaveBeenCalledTimes(2);
		// The payloads are built lazily, so evaluate them: a broken builder would
		// otherwise only surface while someone is debugging a missing database.
		const messages = warn.mock.calls.map(
			(call: unknown[]): string => (call[0] as () => { msg: string })().msg,
		);
		expect(messages).toEqual([
			"Failed to initialize MaxMind City reader",
			"Failed to initialize MaxMind ASN reader",
		]);
	});

	it("is safe to call twice", async () => {
		// Callers may initialize defensively; the second call must not leave the
		// backend worse off than the first.
		const backend = new MaxMindBackend({
			cityDbPath: CITY_DB,
			openReader: opens({ city: reader({ city: () => cityData() }) }),
		});

		await backend.initialize();
		await backend.initialize();

		expect(backend.isAvailable()).toBe(true);
	});
});

describe("MaxMindBackend.isAvailable", () => {
	it("is unavailable before initialize, even when paths are configured", async () => {
		// Configured is not the same as ready: the databases are opened from disk
		// asynchronously, so a caller that skips initialize gets nothing.
		const backend = new MaxMindBackend({
			cityDbPath: CITY_DB,
			openReader: opens({ city: reader({ city: () => cityData() }) }),
		});

		expect(backend.isAvailable()).toBe(false);
		await backend.initialize();
		expect(backend.isAvailable()).toBe(true);
	});
});

describe("MaxMindBackend.lookup", () => {
	const initialised = async (readers: {
		city?: ReaderModel;
		asn?: ReaderModel;
	}): Promise<MaxMindBackend> => {
		const backend = new MaxMindBackend({
			cityDbPath: readers.city ? CITY_DB : undefined,
			asnDbPath: readers.asn ? ASN_DB : undefined,
			openReader: opens(readers),
		});
		await backend.initialize();
		return backend;
	};

	it("refuses to look up before the databases are open", async () => {
		const backend = new MaxMindBackend({ cityDbPath: CITY_DB });

		await expect(backend.lookup(IP)).resolves.toEqual({
			isValid: false,
			error: "MaxMind readers not initialized",
			ip: IP,
		});
	});

	it("maps city data onto the shared result shape", async () => {
		const backend = await initialised({
			city: reader({ city: () => cityData() }),
		});

		const result = expectValid(await backend.lookup(IP));

		expect(result).toMatchObject({
			ip: IP,
			isValid: true,
			country: "United States",
			countryCode: "US",
			region: "California",
			city: "Mountain View",
			latitude: 37.4,
			longitude: -122.1,
			timezone: "America/Los_Angeles",
		});
	});

	it("reports threat indicators the free databases never populate as false", async () => {
		// GeoLite2 does not carry these traits. They must read false rather than
		// undefined, or every consumer has to re-decide what absence means.
		const backend = await initialised({
			city: reader({ city: () => cityData() }),
		});

		const result = expectValid(await backend.lookup(IP));

		expect(result.isVPN).toBe(false);
		expect(result.isTor).toBe(false);
		expect(result.isProxy).toBe(false);
		expect(result.isAbuser).toBe(false);
		expect(result.isMobile).toBe(false);
		expect(result.isCrawler).toBe(false);
	});

	it("reads the anonymity traits when a paid database supplies them", async () => {
		const backend = await initialised({
			city: reader({
				city: () =>
					cityData({
						traits: {
							isAnonymousVpn: true,
							isTorExitNode: true,
							isHostingProvider: true,
							isSatelliteProvider: true,
						},
					} as Partial<City>),
			}),
		});

		const result = expectValid(await backend.lookup(IP));

		expect(result.isVPN).toBe(true);
		expect(result.isTor).toBe(true);
		expect(result.isDatacenter).toBe(true);
		expect(result.isSatellite).toBe(true);
	});

	it("treats a residential proxy as a proxy", async () => {
		// Two distinct traits collapse into one flag; missing either would let a
		// proxied request through unflagged.
		const residential = await initialised({
			city: reader({
				city: () =>
					cityData({ traits: { isResidentialProxy: true } } as Partial<City>),
			}),
		});
		const publicProxy = await initialised({
			city: reader({
				city: () =>
					cityData({ traits: { isPublicProxy: true } } as Partial<City>),
			}),
		});

		expect(expectValid(await residential.lookup(IP)).isProxy).toBe(true);
		expect(expectValid(await publicProxy.lookup(IP)).isProxy).toBe(true);
	});

	it("falls back to the ASN database for the AS number", async () => {
		const backend = await initialised({
			city: reader({ city: () => cityData() }),
			asn: reader({ asn: () => asnData() }),
		});

		const result = expectValid(await backend.lookup(IP));

		expect(result.asnNumber).toBe(15169);
		expect(result.asnOrganization).toBe("Google LLC");
	});

	it("prefers the City database's ASN traits over the ASN database", async () => {
		// The City database is the more specific source when it carries traits.
		const backend = await initialised({
			city: reader({
				city: () =>
					cityData({
						traits: {
							autonomousSystemNumber: 111,
							autonomousSystemOrganization: "From City",
						},
					} as Partial<City>),
			}),
			asn: reader({ asn: () => asnData({ autonomousSystemNumber: 222 }) }),
		});

		const result = expectValid(await backend.lookup(IP));

		expect(result.asnNumber).toBe(111);
		expect(result.asnOrganization).toBe("From City");
	});

	it("returns ASN-only data when no City database is configured", async () => {
		const backend = await initialised({
			asn: reader({ asn: () => asnData() }),
		});

		const result = expectValid(await backend.lookup(IP));

		expect(result.asnNumber).toBe(15169);
		expect(result.country).toBeUndefined();
	});

	it("reports no data when the IP is in neither database", async () => {
		// The real Reader throws AddressNotFoundError for an unknown IP. Both
		// lookups failing is not an error — it is simply an absent answer.
		const missing = (): never => {
			throw new Error("address not found");
		};
		const backend = await initialised({
			city: reader({ city: missing }),
			asn: reader({ asn: missing }),
		});

		await expect(backend.lookup(IP)).resolves.toEqual({
			isValid: false,
			error: "No MaxMind data available for IP",
			ip: IP,
		});
	});

	it("still answers from the ASN database when the City lookup throws", async () => {
		// Partial data beats no data: an IP present in one database and not the
		// other is common.
		const backend = await initialised({
			city: reader({
				city: (): never => {
					throw new Error("address not found");
				},
			}),
			asn: reader({ asn: () => asnData() }),
		});

		const result = expectValid(await backend.lookup(IP));

		expect(result.asnNumber).toBe(15169);
		expect(result.country).toBeUndefined();
	});

	it("maps a hosting user type onto the provider type", async () => {
		const backend = await initialised({
			city: reader({
				city: () =>
					cityData({ traits: { userType: "hosting" } } as Partial<City>),
			}),
		});

		expect(expectValid(await backend.lookup(IP)).providerType).toBe("hosting");
	});

	it("maps every user type MaxMind can emit", async () => {
		// Exhaustive on purpose: each case is a routing decision downstream, and
		// a type silently falling through to undefined is indistinguishable from
		// "no data" at the consumer.
		const forUserType = async (
			userType: string,
		): Promise<string | undefined> => {
			const backend = await initialised({
				city: reader({
					city: () =>
						cityData({ traits: { userType } } as unknown as Partial<City>),
				}),
			});
			return expectValid(await backend.lookup(IP)).providerType;
		};

		const expected: Record<string, string | undefined> = {
			hosting: "hosting",
			content_delivery_network: "hosting",
			college: "education",
			school: "education",
			library: "education",
			government: "government",
			military: "government",
			business: "business",
			residential: "isp",
			cellular: "isp",
			dialup: "isp",
			cafe: "isp",
			traveler: "isp",
			router: "isp",
		};

		for (const [userType, providerType] of Object.entries(expected)) {
			expect(await forUserType(userType), userType).toBe(providerType);
		}
	});

	it("logs each failed database lookup with the IP and the cause", async () => {
		// The log lines are built lazily; if the payload builder is wrong nobody
		// finds out until an incident, so it is evaluated here.
		const debug = vi.fn();
		const missing = (): never => {
			throw new Error("address not found");
		};
		const backend = new MaxMindBackend({
			cityDbPath: CITY_DB,
			asnDbPath: ASN_DB,
			openReader: opens({
				city: reader({ city: missing }),
				asn: reader({ asn: missing }),
			}),
			logger: { debug, warn: vi.fn(), info: vi.fn() } as never,
		});
		await backend.initialize();

		await backend.lookup(IP);

		expect(debug).toHaveBeenCalledTimes(2);
		type DebugPayload = { msg: string; data: { ip: string } };
		const payloads: DebugPayload[] = debug.mock.calls.map(
			(call: unknown[]): DebugPayload => (call[0] as () => DebugPayload)(),
		);
		expect(payloads.map((p) => p.msg)).toEqual([
			"MaxMind City lookup failed",
			"MaxMind ASN lookup failed",
		]);
		expect(payloads.every((p) => p.data.ip === IP)).toBe(true);
	});

	it("leaves the provider type unset for a user type it does not map", async () => {
		// e.g. "search_engine_spider" — deliberately unmapped rather than forced
		// into a category it does not belong to.
		const backend = await initialised({
			city: reader({
				city: () =>
					cityData({
						traits: { userType: "search_engine_spider" },
					} as unknown as Partial<City>),
			}),
		});

		expect(expectValid(await backend.lookup(IP)).providerType).toBeUndefined();
	});

	it("leaves the provider type unset when there is no user type at all", async () => {
		const backend = await initialised({
			city: reader({ city: () => cityData() }),
		});

		expect(expectValid(await backend.lookup(IP)).providerType).toBeUndefined();
	});

	it("turns a failure during mapping into an error response", async () => {
		// The per-database try blocks only cover the lookup call itself. A throw
		// while reading the returned record — here a getter that fails, standing
		// in for any malformed decode — happens outside them, and must still not
		// escape to the caller.
		const hostile = {
			get traits(): never {
				throw new Error("corrupt record");
			},
		};
		const backend = await initialised({
			city: reader({ city: () => hostile as unknown as City }),
		});

		await expect(backend.lookup(IP)).resolves.toEqual({
			isValid: false,
			error: "MaxMind lookup error: corrupt record",
			ip: IP,
		});
	});

	it("describes a non-Error failure without printing [object Object]", async () => {
		const hostile = {
			get traits(): never {
				// The case under test is a non-Error throw, hence the string.
				throw "just a string";
			},
		};
		const backend = await initialised({
			city: reader({ city: () => hostile as unknown as City }),
		});

		const response = await backend.lookup(IP);

		expect(response).toMatchObject({
			isValid: false,
			error: "MaxMind lookup error: just a string",
		});
	});
});

describe("MaxMindBackend default reader", () => {
	it("does not throw when the real database file is missing", async () => {
		// Exercises the un-injected path: the lazy import of the MaxMind reader
		// runs for real, and its failure to open a nonexistent file must be
		// contained exactly like an injected one.
		const backend = new MaxMindBackend({
			cityDbPath: "/nonexistent/prosopo-test/GeoLite2-City.mmdb",
		});

		await expect(backend.initialize()).resolves.toBeUndefined();
		expect(backend.isAvailable()).toBe(false);
	});
});
