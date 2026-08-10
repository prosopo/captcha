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

// The service is pure routing: which backend answers, in what order, and what
// happens when one of them declines. The backends are therefore injected as
// stubs whose availability and answers each test controls directly — using the
// real ones would put a network call and a database file between the test and
// the branch it is trying to reach.

import type { IPInfoResponse, IPInfoResult } from "@prosopo/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	type IpInfoBackends,
	IpInfoService,
	isNonRoutable,
} from "../IpInfoService.js";
import type { IpapiBackend } from "../backends/ipapi.js";
import type { MaxMindBackend } from "../backends/maxmind.js";
import type { IpInfoServiceConfig } from "../types.js";

const IP = "8.8.8.8";

const result = (source: string): IPInfoResult => ({
	isValid: true,
	ip: IP,
	countryCode: source,
	isVPN: false,
	isTor: false,
	isProxy: false,
	isDatacenter: false,
	isAbuser: false,
	isMobile: false,
	isSatellite: false,
	isCrawler: false,
});

const failure = (error: string): IPInfoResponse => ({
	isValid: false,
	error,
	ip: IP,
});

interface StubBackend {
	initialize: () => Promise<void>;
	isAvailable: () => boolean;
	lookup: (ip: string) => Promise<IPInfoResponse>;
}

const stub = (
	available: boolean,
	answer: IPInfoResponse = result("stub"),
): StubBackend => ({
	initialize: vi.fn<() => Promise<void>>(async () => {}),
	isAvailable: vi.fn<() => boolean>(() => available),
	lookup: vi.fn<(ip: string) => Promise<IPInfoResponse>>(async () => answer),
});

/**
 * The stubs implement the whole interface the service uses, but not the private
 * fields of the concrete classes, so the injection point needs a cast. Confined
 * to this one helper rather than repeated at every call site.
 */
const service = (
	backends: { maxmind?: StubBackend; ipapi?: StubBackend },
	config: IpInfoServiceConfig = {},
): IpInfoService =>
	new IpInfoService(config, {
		maxmind: backends.maxmind as unknown as MaxMindBackend,
		ipapi: backends.ipapi as unknown as IpapiBackend,
	} satisfies IpInfoBackends);

describe("isNonRoutable", () => {
	it("rejects the IPv4 loopback and private ranges", () => {
		for (const ip of [
			"127.0.0.1",
			"127.255.255.255",
			"10.0.0.1",
			"192.168.1.1",
			"169.254.1.1",
			"0.0.0.0",
		]) {
			expect(isNonRoutable(ip), ip).toBe(true);
		}
	});

	it("rejects the whole 172.16/12 block and nothing either side of it", () => {
		// The boundaries matter: 172.15 and 172.32 are public address space, and
		// treating them as private would silently blind the service to them.
		expect(isNonRoutable("172.16.0.0")).toBe(true);
		expect(isNonRoutable("172.31.255.255")).toBe(true);
		expect(isNonRoutable("172.15.0.1")).toBe(false);
		expect(isNonRoutable("172.32.0.1")).toBe(false);
		expect(isNonRoutable("172.217.16.1")).toBe(false);
	});

	it("treats a malformed 172. address as routable rather than crashing", () => {
		// parseInt of a missing or non-numeric octet yields NaN, and every
		// comparison against NaN is false — so this must fall through, not throw.
		expect(isNonRoutable("172.")).toBe(false);
		expect(isNonRoutable("172.abc.0.1")).toBe(false);
	});

	it("sees through the IPv4-mapped IPv6 prefix", () => {
		// A request arriving on a dual-stack socket presents 127.0.0.1 in this
		// form; missing it would send loopback traffic to a paid upstream.
		expect(isNonRoutable("::ffff:127.0.0.1")).toBe(true);
		expect(isNonRoutable("::FFFF:192.168.0.1")).toBe(true);
		expect(isNonRoutable("::ffff:8.8.8.8")).toBe(false);
	});

	it("rejects the IPv6 loopback, unspecified, ULA and link-local ranges", () => {
		for (const ip of [
			"::1",
			"::",
			"fc00::1",
			"fd12:3456::1",
			"FD00::1",
			"fe80::1",
			"feb0::1",
			"FE80::1",
		]) {
			expect(isNonRoutable(ip), ip).toBe(true);
		}
	});

	it("accepts public IPv4 and IPv6 addresses", () => {
		for (const ip of [
			"8.8.8.8",
			"1.1.1.1",
			"2001:4860:4860::8888",
			"fec0::1",
		]) {
			expect(isNonRoutable(ip), ip).toBe(false);
		}
	});

	it("treats an empty string as routable", () => {
		// Not this function's job to validate: the backends reject it, and
		// claiming "non-routable" would hide a caller bug behind a plausible
		// looking answer.
		expect(isNonRoutable("")).toBe(false);
	});
});

describe("IpInfoService construction", () => {
	it("builds no backends when nothing is configured", () => {
		expect(new IpInfoService({}).isAvailable()).toBe(false);
	});

	it("builds MaxMind from either database path alone", async () => {
		// Only one of the two databases being licensed is a normal deployment.
		const city = new IpInfoService({ maxmindCityDbPath: "/city.mmdb" });
		const asn = new IpInfoService({ maxmindAsnDbPath: "/asn.mmdb" });

		// Unopened, so still unavailable — but constructed, which the lookup
		// error message distinguishes.
		expect(await city.lookup(IP)).toEqual(
			failure("No IP info backend available"),
		);
		expect(await asn.lookup(IP)).toEqual(
			failure("No IP info backend available"),
		);
	});

	it("builds ipapi when a url is configured", () => {
		expect(
			new IpInfoService({ ipapiUrl: "https://api.ipapi.is" }).isAvailable(),
		).toBe(true);
	});

	it("does not build ipapi from a key with no url", () => {
		// A key without an endpoint is a half-finished configuration; guessing a
		// default endpoint would send credentials somewhere never asked for.
		expect(new IpInfoService({ ipapiKey: "secret" }).isAvailable()).toBe(false);
	});

	it("uses injected backends in place of configured ones", () => {
		// Injection must win outright: a config that would otherwise build a real
		// ipapi backend must not leave a second one behind.
		const ipapi = stub(false);
		const svc = service({ ipapi }, { ipapiUrl: "https://api.ipapi.is" });

		expect(svc.isAvailable()).toBe(false);
		expect(ipapi.isAvailable).toHaveBeenCalled();
	});
});

describe("IpInfoService.initialize", () => {
	it("initializes MaxMind and leaves ipapi alone", async () => {
		// ipapi is stateless — there is nothing to open — so an initialize call
		// against it would be dead work on every boot.
		const maxmind = stub(true);
		const ipapi = stub(true);

		await service({ maxmind, ipapi }).initialize();

		expect(maxmind.initialize).toHaveBeenCalledTimes(1);
		expect(ipapi.initialize).not.toHaveBeenCalled();
	});

	it("succeeds when there are no backends at all", async () => {
		await expect(new IpInfoService({}).initialize()).resolves.toBeUndefined();
	});

	it("logs the availability of both backends", async () => {
		const info = vi.fn();
		await service(
			{ maxmind: stub(true), ipapi: stub(false) },
			{ logger: { info } as never },
		).initialize();

		expect(info).toHaveBeenCalledTimes(1);
		const entry = info.mock.calls[0]?.[0];
		expect(typeof entry).toBe("function");
		expect(entry()).toMatchObject({
			data: { maxmindAvailable: true, ipapiAvailable: false },
		});
	});

	it("propagates a MaxMind initialize failure", async () => {
		// MaxMind swallows its own open failures, so anything reaching here is
		// unexpected and must surface at boot rather than as a silent lookup gap.
		const maxmind = stub(true);
		maxmind.initialize = vi.fn<() => Promise<void>>(async () => {
			throw new Error("disk on fire");
		});

		await expect(service({ maxmind }).initialize()).rejects.toThrow(
			"disk on fire",
		);
	});
});

describe("IpInfoService.isAvailable", () => {
	it.each([
		[true, true, true],
		[true, false, true],
		[false, true, true],
		[false, false, false],
	])(
		"maxmind=%s ipapi=%s -> %s",
		(maxmindUp: boolean, ipapiUp: boolean, expected: boolean) => {
			expect(
				service({
					maxmind: stub(maxmindUp),
					ipapi: stub(ipapiUp),
				}).isAvailable(),
			).toBe(expected);
		},
	);
});

describe("IpInfoService.lookup", () => {
	let maxmind: StubBackend;
	let ipapi: StubBackend;

	beforeEach(() => {
		maxmind = stub(true, result("maxmind"));
		ipapi = stub(true, result("ipapi"));
	});

	it("short-circuits a non-routable IP without touching a backend", async () => {
		// The important half of this assertion is the second: a loopback lookup
		// must not spend a paid ipapi credit.
		await expect(
			service({ maxmind, ipapi }).lookup("127.0.0.1"),
		).resolves.toEqual({
			isValid: false,
			error: "Non-routable IP address",
			ip: "127.0.0.1",
		});
		expect(ipapi.lookup).not.toHaveBeenCalled();
		expect(maxmind.lookup).not.toHaveBeenCalled();
	});

	it("prefers ipapi when both are available", async () => {
		// ipapi carries the threat data MaxMind's free databases do not.
		const response = await service({ maxmind, ipapi }).lookup(IP);

		expect(response).toEqual(result("ipapi"));
		expect(maxmind.lookup).not.toHaveBeenCalled();
	});

	it("falls back to MaxMind when ipapi returns an invalid result", async () => {
		ipapi = stub(true, failure("upstream 503"));

		await expect(service({ maxmind, ipapi }).lookup(IP)).resolves.toEqual(
			result("maxmind"),
		);
	});

	it("returns the ipapi error when MaxMind cannot cover for it", async () => {
		// Reporting the real upstream error beats a generic "no backend" message
		// that would send someone looking at the wrong system.
		ipapi = stub(true, failure("upstream 503"));

		await expect(
			service({ maxmind: stub(false), ipapi }).lookup(IP),
		).resolves.toEqual(failure("upstream 503"));
	});

	it("returns the ipapi error when MaxMind is not configured at all", async () => {
		ipapi = stub(true, failure("upstream 503"));

		await expect(service({ ipapi }).lookup(IP)).resolves.toEqual(
			failure("upstream 503"),
		);
	});

	it("logs the fallback with the upstream error attached", async () => {
		const debug = vi.fn();
		ipapi = stub(true, failure("upstream 503"));

		await service({ maxmind, ipapi }, { logger: { debug } as never }).lookup(
			IP,
		);

		expect(debug).toHaveBeenCalledTimes(1);
		expect(debug.mock.calls[0]?.[0]()).toMatchObject({
			data: { ip: IP, error: "upstream 503" },
		});
	});

	it("logs 'unknown' when the failed result carries no error field", async () => {
		// The result type permits it; the log line must stay well-formed rather
		// than printing undefined.
		const debug = vi.fn();
		ipapi = stub(true, { isValid: false, ip: IP } as IPInfoResponse);

		await service({ maxmind, ipapi }, { logger: { debug } as never }).lookup(
			IP,
		);

		expect(debug.mock.calls[0]?.[0]()).toMatchObject({
			data: { error: "unknown" },
		});
	});

	it("does not log a fallback when ipapi succeeds", async () => {
		const debug = vi.fn();

		await service({ maxmind, ipapi }, { logger: { debug } as never }).lookup(
			IP,
		);

		expect(debug).not.toHaveBeenCalled();
	});

	it("uses MaxMind alone when ipapi is unavailable", async () => {
		// Unavailable is checked before the call, so no failed request is made.
		const down = stub(false);
		const response = await service({ maxmind, ipapi: down }).lookup(IP);

		expect(response).toEqual(result("maxmind"));
		expect(down.lookup).not.toHaveBeenCalled();
	});

	it("reports that no backend is available when neither is", async () => {
		await expect(
			service({ maxmind: stub(false), ipapi: stub(false) }).lookup(IP),
		).resolves.toEqual(failure("No IP info backend available"));
	});

	it("reports that no backend is available when none is configured", async () => {
		await expect(new IpInfoService({}).lookup(IP)).resolves.toEqual(
			failure("No IP info backend available"),
		);
	});

	it("passes the IP through to the backend unmodified", async () => {
		// Normalisation happens inside isNonRoutable only; the backend must see
		// exactly what the caller supplied.
		await service({ ipapi }).lookup("2001:4860:4860::8888");

		expect(ipapi.lookup).toHaveBeenCalledWith("2001:4860:4860::8888");
	});

	it("does not catch a backend that throws", async () => {
		// Deliberate: both backends convert their own failures into invalid
		// results, so a throw reaching here is a bug and must not be disguised as
		// a routine lookup miss.
		ipapi.lookup = vi.fn<(ip: string) => Promise<IPInfoResponse>>(async () => {
			throw new Error("unexpected");
		});

		await expect(service({ maxmind, ipapi }).lookup(IP)).rejects.toThrow(
			"unexpected",
		);
		expect(maxmind.lookup).not.toHaveBeenCalled();
	});

	it("re-checks availability on every lookup", async () => {
		// A backend can come up between calls; the answer must not be cached at
		// construction time.
		let up = false;
		const flaky: StubBackend = {
			initialize: vi.fn<() => Promise<void>>(async () => {}),
			isAvailable: vi.fn<() => boolean>(() => up),
			lookup: vi.fn<(ip: string) => Promise<IPInfoResponse>>(async () =>
				result("recovered"),
			),
		};
		const svc = service({ ipapi: flaky });

		expect(await svc.lookup(IP)).toEqual(
			failure("No IP info backend available"),
		);
		up = true;
		expect(await svc.lookup(IP)).toEqual(result("recovered"));
	});
});
