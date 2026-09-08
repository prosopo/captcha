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

import {
	type IpInfoBackends,
	IpInfoService,
	type MaxMindBackend,
} from "@prosopo/ipinfo";
import type { IPInfoResponse } from "@prosopo/types";
import type { IIpInfoService } from "@prosopo/types-env";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	type HealthzGeoConfig,
	HealthzGeoRouter,
	type HealthzProbe,
	TargetHealthMonitor,
	getHealthzGeoRouter,
	readHealthzGeoConfig,
	resetHealthzGeoRouter,
} from "../../../api/healthzGeo.js";

const OWN_HOST = "node-a.example.com";
const TARGET_HOST = "node-b.example.com";
const CLIENT_IP = "8.8.8.8";

/**
 * An ip-info service whose country answers the test controls. `lookup` is
 * present because the interface requires it and rejects because nothing on
 * this path may call it — reaching it would mean a request to the sidecar.
 */
const ipInfo = (options: {
	available?: boolean;
	country?: string | undefined;
}): IIpInfoService => ({
	initialize: vi.fn<() => Promise<void>>(async () => {}),
	lookup: vi.fn<(ip: string) => Promise<IPInfoResponse>>(async () => {
		throw new Error("lookup() must not be called by healthz");
	}),
	country: vi.fn<(ip: string) => string | undefined>(() => options.country),
	isAvailable: vi.fn<() => boolean>(() => options.available ?? true),
});

const config = (
	overrides: Partial<HealthzGeoConfig> = {},
): HealthzGeoConfig => ({
	enabled: true,
	routes: new Map([["US", TARGET_HOST]]),
	probeIntervalMs: 30_000,
	probeTimeoutMs: 2_000,
	...overrides,
});

/** A monitor that reports the given hosts as up, without probing anything. */
const monitorWith = (...upHosts: string[]): TargetHealthMonitor => {
	const monitor = new TargetHealthMonitor({
		hosts: upHosts,
		intervalMs: 30_000,
		timeoutMs: 2_000,
		probe: vi.fn<HealthzProbe>(async () => true),
	});
	// One synchronous round rather than start(): no timer, nothing to clean up.
	return monitor;
};

const readyMonitor = async (
	...upHosts: string[]
): Promise<TargetHealthMonitor> => {
	const monitor = monitorWith(...upHosts);
	await monitor.pollAll();
	return monitor;
};

describe("readHealthzGeoConfig", () => {
	it("is disabled when nothing is set", () => {
		expect(readHealthzGeoConfig({}).enabled).toBe(false);
	});

	it("is disabled when the flag is set to anything but 'true'", () => {
		for (const flag of ["false", "1", "yes", "TRUE", ""]) {
			expect(
				readHealthzGeoConfig({
					PROSOPO_HEALTHZ_GEO_STEERING: flag,
					PROSOPO_HEALTHZ_GEO_ROUTES: `{"US":"${TARGET_HOST}"}`,
				}).enabled,
			).toBe(false);
		}
	});

	it("is disabled when the flag is on but no routes are configured", () => {
		// A node with the flag and no map cannot steer, so it must not start a
		// poller or mark its responses uncacheable either.
		expect(
			readHealthzGeoConfig({ PROSOPO_HEALTHZ_GEO_STEERING: "true" }).enabled,
		).toBe(false);
	});

	it("enables steering and upper-cases the country keys", () => {
		const parsed = readHealthzGeoConfig({
			PROSOPO_HEALTHZ_GEO_STEERING: "true",
			PROSOPO_HEALTHZ_GEO_ROUTES: `{"us":"${TARGET_HOST}"}`,
		});

		expect(parsed.enabled).toBe(true);
		expect(parsed.routes.get("US")).toBe(TARGET_HOST);
	});

	it("stays off when the route map is unparseable or malformed", () => {
		for (const routes of [
			"not json",
			"[]",
			'{"USA":"node-b.example.com"}',
			'{"US":""}',
			'{"US":"https://node-b.example.com/healthz"}',
			'{"US":123}',
		]) {
			const parsed = readHealthzGeoConfig({
				PROSOPO_HEALTHZ_GEO_STEERING: "true",
				PROSOPO_HEALTHZ_GEO_ROUTES: routes,
			});
			expect(parsed.enabled).toBe(false);
			expect(parsed.routes.size).toBe(0);
		}
	});

	it("defaults the probe period and timeout, and rejects nonsense overrides", () => {
		const defaults = readHealthzGeoConfig({});
		expect(defaults.probeIntervalMs).toBe(30_000);
		expect(defaults.probeTimeoutMs).toBe(2_000);

		const overridden = readHealthzGeoConfig({
			PROSOPO_HEALTHZ_GEO_PROBE_INTERVAL_MS: "5000",
			PROSOPO_HEALTHZ_GEO_PROBE_TIMEOUT_MS: "500",
		});
		expect(overridden.probeIntervalMs).toBe(5_000);
		expect(overridden.probeTimeoutMs).toBe(500);

		const nonsense = readHealthzGeoConfig({
			PROSOPO_HEALTHZ_GEO_PROBE_INTERVAL_MS: "0",
			PROSOPO_HEALTHZ_GEO_PROBE_TIMEOUT_MS: "-1",
		});
		expect(nonsense.probeIntervalMs).toBe(30_000);
		expect(nonsense.probeTimeoutMs).toBe(2_000);

		// A busy-loop period is clamped, not honoured.
		expect(
			readHealthzGeoConfig({ PROSOPO_HEALTHZ_GEO_PROBE_INTERVAL_MS: "5" })
				.probeIntervalMs,
		).toBe(1_000);
	});
});

describe("HealthzGeoRouter.resolveHost", () => {
	it("steers to the host the caller's country maps to", async () => {
		const service = ipInfo({ country: "US" });
		const router = new HealthzGeoRouter(
			config(),
			{ ipInfoService: service },
			await readyMonitor(TARGET_HOST),
		);

		expect(router.resolveHost(CLIENT_IP, OWN_HOST)).toEqual({
			host: TARGET_HOST,
			outcome: "steered",
		});
		expect(service.lookup).not.toHaveBeenCalled();
	});

	it("answers with its own name when the flag is off", async () => {
		const service = ipInfo({ country: "US" });
		const router = new HealthzGeoRouter(
			config({ enabled: false }),
			{ ipInfoService: service },
			await readyMonitor(TARGET_HOST),
		);

		expect(router.resolveHost(CLIENT_IP, OWN_HOST)).toEqual({
			host: OWN_HOST,
			outcome: "not_steered",
		});
		// Nothing is looked up at all: with the flag off this costs nothing.
		expect(service.isAvailable).not.toHaveBeenCalled();
		expect(service.country).not.toHaveBeenCalled();
	});

	it("answers with its own name when the country has no override", async () => {
		const router = new HealthzGeoRouter(
			config(),
			{ ipInfoService: ipInfo({ country: "GB" }) },
			await readyMonitor(TARGET_HOST),
		);

		expect(router.resolveHost(CLIENT_IP, OWN_HOST)).toEqual({
			host: OWN_HOST,
			outcome: "not_steered",
		});
	});

	it("answers with its own name when the override names this node", async () => {
		const router = new HealthzGeoRouter(
			config({ routes: new Map([["US", OWN_HOST]]) }),
			{ ipInfoService: ipInfo({ country: "US" }) },
			await readyMonitor(OWN_HOST),
		);

		expect(router.resolveHost(CLIENT_IP, OWN_HOST)).toEqual({
			host: OWN_HOST,
			outcome: "not_steered",
		});
	});

	it("reports geo_unavailable when the country is unknown", async () => {
		const router = new HealthzGeoRouter(
			config(),
			{ ipInfoService: ipInfo({ country: undefined }) },
			await readyMonitor(TARGET_HOST),
		);

		expect(router.resolveHost(CLIENT_IP, OWN_HOST)).toEqual({
			host: OWN_HOST,
			outcome: "geo_unavailable",
		});
	});

	it("reports geo_unavailable, without a lookup, while ip info is unavailable", async () => {
		// This is the pre-readiness case. healthz answers before the
		// environment is ready and must never wait for it.
		const service = ipInfo({ available: false, country: "US" });
		const router = new HealthzGeoRouter(
			config(),
			{ ipInfoService: service },
			await readyMonitor(TARGET_HOST),
		);

		expect(router.resolveHost(CLIENT_IP, OWN_HOST)).toEqual({
			host: OWN_HOST,
			outcome: "geo_unavailable",
		});
		expect(service.country).not.toHaveBeenCalled();
		expect(service.lookup).not.toHaveBeenCalled();
	});

	it("reports geo_unavailable when the request has no address", async () => {
		const router = new HealthzGeoRouter(
			config(),
			{ ipInfoService: ipInfo({ country: "US" }) },
			await readyMonitor(TARGET_HOST),
		);

		expect(router.resolveHost(undefined, OWN_HOST)).toEqual({
			host: OWN_HOST,
			outcome: "geo_unavailable",
		});
	});

	it("does not steer a loopback caller", async () => {
		// Deploy gates and container health checks call over loopback. The real
		// service is used here: the short-circuit lives inside it, and the point
		// of the test is that healthz inherits it.
		const maxmind = {
			initialize: vi.fn<() => Promise<void>>(async () => {}),
			isAvailable: vi.fn<() => boolean>(() => true),
			countryCode: vi.fn<(ip: string) => string | undefined>(() => "US"),
		};
		const service = new IpInfoService({}, {
			maxmind: maxmind as unknown as MaxMindBackend,
		} satisfies IpInfoBackends);
		const router = new HealthzGeoRouter(
			config(),
			{ ipInfoService: service },
			await readyMonitor(TARGET_HOST),
		);

		for (const ip of ["127.0.0.1", "::1", "::ffff:127.0.0.1", "172.18.0.4"]) {
			expect(router.resolveHost(ip, OWN_HOST)).toEqual({
				host: OWN_HOST,
				outcome: "geo_unavailable",
			});
		}
		expect(maxmind.countryCode).not.toHaveBeenCalled();
	});

	it("does not steer to a target that is not confirmed up", async () => {
		// The monitor has never seen this host answer, so it is down by default.
		const router = new HealthzGeoRouter(
			config(),
			{ ipInfoService: ipInfo({ country: "US" }) },
			monitorWith(TARGET_HOST),
		);

		expect(router.resolveHost(CLIENT_IP, OWN_HOST)).toEqual({
			host: OWN_HOST,
			outcome: "target_down",
		});
	});

	it("stops steering once the target stops answering", async () => {
		let healthy = true;
		const monitor = new TargetHealthMonitor({
			hosts: [TARGET_HOST],
			intervalMs: 30_000,
			timeoutMs: 2_000,
			probe: vi.fn<HealthzProbe>(async () => healthy),
		});
		const router = new HealthzGeoRouter(
			config(),
			{ ipInfoService: ipInfo({ country: "US" }) },
			monitor,
		);

		await monitor.pollAll();
		expect(router.resolveHost(CLIENT_IP, OWN_HOST).outcome).toBe("steered");

		healthy = false;
		await monitor.pollAll();
		expect(router.resolveHost(CLIENT_IP, OWN_HOST).outcome).toBe("target_down");
	});
});

describe("TargetHealthMonitor", () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it("reports every host down before it has probed anything", () => {
		const monitor = monitorWith(TARGET_HOST);

		expect(monitor.isUp(TARGET_HOST)).toBe(false);
		expect(monitor.isUp("never-configured.example.com")).toBe(false);
	});

	it("keeps a host down when its probe rejects", async () => {
		const monitor = new TargetHealthMonitor({
			hosts: [TARGET_HOST],
			intervalMs: 30_000,
			timeoutMs: 2_000,
			probe: vi.fn<HealthzProbe>(async () => {
				throw new Error("connect ECONNREFUSED");
			}),
		});

		await expect(monitor.pollAll()).resolves.toBeUndefined();
		expect(monitor.isUp(TARGET_HOST)).toBe(false);
	});

	it("probes each distinct host once per round", async () => {
		const probe = vi.fn<HealthzProbe>(async () => true);
		const monitor = new TargetHealthMonitor({
			hosts: [TARGET_HOST, TARGET_HOST, "node-c.example.com"],
			intervalMs: 30_000,
			timeoutMs: 1_500,
			probe,
		});

		await monitor.pollAll();

		expect(probe).toHaveBeenCalledTimes(2);
		expect(probe).toHaveBeenCalledWith(TARGET_HOST, 1_500);
	});

	it("polls on its interval and stops when told to", async () => {
		vi.useFakeTimers();
		const probe = vi.fn<HealthzProbe>(async () => true);
		const monitor = new TargetHealthMonitor({
			hosts: [TARGET_HOST],
			intervalMs: 1_000,
			timeoutMs: 500,
			probe,
		});

		monitor.start();
		expect(probe).toHaveBeenCalledTimes(1);

		await vi.advanceTimersByTimeAsync(2_500);
		expect(probe).toHaveBeenCalledTimes(3);

		monitor.stop();
		await vi.advanceTimersByTimeAsync(5_000);
		expect(probe).toHaveBeenCalledTimes(3);
	});

	it("starts no timer when there is nothing to probe", () => {
		vi.useFakeTimers();
		const probe = vi.fn<HealthzProbe>(async () => true);
		const monitor = new TargetHealthMonitor({
			hosts: [],
			intervalMs: 1_000,
			timeoutMs: 500,
			probe,
		});

		monitor.start();
		monitor.stop();

		expect(probe).not.toHaveBeenCalled();
		expect(vi.getTimerCount()).toBe(0);
	});
});

describe("getHealthzGeoRouter", () => {
	afterEach(() => {
		resetHealthzGeoRouter();
	});

	it("is off by default and built once per process", () => {
		const router = getHealthzGeoRouter({
			ipInfoService: ipInfo({ country: "US" }),
		});

		expect(router.enabled).toBe(false);
		// One router means one poller, however often the API is rebuilt.
		expect(getHealthzGeoRouter({ ipInfoService: ipInfo({}) })).toBe(router);
	});
});
