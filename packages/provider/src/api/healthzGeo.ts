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

import type { Logger } from "@prosopo/logger";
import { PublicApiPaths } from "@prosopo/types";
import type { IIpInfoService } from "@prosopo/types-env";
import { z } from "zod";

/**
 * Geo steering for `/healthz`.
 *
 * `/healthz` tells a client which node to pin its captcha calls to. By default
 * a node answers with its own name, so the pin is whatever the DNS layer
 * picked. With steering enabled the node instead answers with the node the
 * caller's country is mapped to, when that node is known to be up.
 *
 * Off by default. With the flag off nothing here runs: no lookup, no poller,
 * no response header, no counter.
 *
 * Configuration (all read once, at first use):
 *
 *   PROSOPO_HEALTHZ_GEO_STEERING
 *     "true" enables steering. Anything else, including unset, disables it.
 *
 *   PROSOPO_HEALTHZ_GEO_ROUTES
 *     JSON object mapping ISO 3166-1 alpha-2 country code to hostname, e.g.
 *     `{"XX":"node1.example.com","YY":"node2.example.com"}`. Keys are
 *     case-insensitive. Countries absent from the map are not steered.
 *
 *     The map is the candidate set: a host that must not receive traffic
 *     simply does not appear in it. Nothing here derives candidates from
 *     anywhere else, so the deployment that generates the map is the single
 *     place that decides which nodes are in rotation.
 *
 *   PROSOPO_HEALTHZ_GEO_PROBE_INTERVAL_MS   (default 30000)
 *   PROSOPO_HEALTHZ_GEO_PROBE_TIMEOUT_MS    (default 2000)
 *     Background health-probe period and per-probe timeout.
 *
 * An invalid or unparseable route map disables steering rather than failing
 * startup — the fallback is the node's own name, which is the default
 * behaviour.
 */

const DEFAULT_PROBE_INTERVAL_MS = 30_000;
const DEFAULT_PROBE_TIMEOUT_MS = 2_000;
const MIN_PROBE_INTERVAL_MS = 1_000;

/** Hostname, not a URL: no scheme, no path, no port. */
const hostnameSchema = z
	.string()
	.min(1)
	.max(253)
	.regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i);

const routesSchema = z.record(z.string().regex(/^[a-z]{2}$/i), hostnameSchema);

export interface HealthzGeoConfig {
	enabled: boolean;
	/** Upper-cased ISO 3166-1 alpha-2 country code -> hostname. */
	routes: ReadonlyMap<string, string>;
	probeIntervalMs: number;
	probeTimeoutMs: number;
}

/**
 * Why a given `/healthz` call did or did not get steered. Reported on the
 * `/metrics` endpoint: every non-`steered` outcome is silent in the response
 * body — the fallback is the default behaviour — so this counter is the only
 * signal that steering has stopped working.
 */
export type HealthzGeoOutcome =
	| "steered"
	| "not_steered"
	| "target_down"
	| "geo_unavailable";

export interface HealthzGeoDecision {
	host: string;
	outcome: HealthzGeoOutcome;
}

const parsePositiveInt = (
	raw: string | undefined,
	fallback: number,
): number => {
	if (raw === undefined) return fallback;
	const parsed = Number.parseInt(raw, 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseRoutes = (
	raw: string | undefined,
	logger?: Logger,
): ReadonlyMap<string, string> => {
	if (!raw || raw.trim().length === 0) return new Map();
	try {
		const parsed = routesSchema.parse(JSON.parse(raw));
		return new Map(
			Object.entries(parsed).map(([country, host]) => [
				country.toUpperCase(),
				host,
			]),
		);
	} catch (err) {
		logger?.warn(() => ({
			msg: "PROSOPO_HEALTHZ_GEO_ROUTES is not a valid country->host map; healthz geo steering stays off",
			err,
		}));
		return new Map();
	}
};

export const readHealthzGeoConfig = (
	envVars: NodeJS.ProcessEnv = process.env,
	logger?: Logger,
): HealthzGeoConfig => {
	const routes = parseRoutes(envVars.PROSOPO_HEALTHZ_GEO_ROUTES, logger);
	return {
		// An empty map cannot steer anything, so treat it as off. That keeps
		// the poller from starting and the response header from being set on a
		// node that has been given the flag but no map.
		enabled: envVars.PROSOPO_HEALTHZ_GEO_STEERING === "true" && routes.size > 0,
		routes,
		probeIntervalMs: Math.max(
			MIN_PROBE_INTERVAL_MS,
			parsePositiveInt(
				envVars.PROSOPO_HEALTHZ_GEO_PROBE_INTERVAL_MS,
				DEFAULT_PROBE_INTERVAL_MS,
			),
		),
		probeTimeoutMs: parsePositiveInt(
			envVars.PROSOPO_HEALTHZ_GEO_PROBE_TIMEOUT_MS,
			DEFAULT_PROBE_TIMEOUT_MS,
		),
	};
};

/** Resolves to true when the host answered its own health check. */
export type HealthzProbe = (
	host: string,
	timeoutMs: number,
) => Promise<boolean>;

export const fetchHealthzProbe: HealthzProbe = async (host, timeoutMs) => {
	try {
		const response = await fetch(`https://${host}${PublicApiPaths.Healthz}`, {
			method: "GET",
			signal: AbortSignal.timeout(timeoutMs),
		});
		return response.ok;
	} catch {
		return false;
	}
};

export interface TargetHealthMonitorOptions {
	hosts: readonly string[];
	intervalMs: number;
	timeoutMs: number;
	/** Injected in tests; defaults to a real request. */
	probe?: HealthzProbe;
	logger?: Logger;
}

/**
 * Tracks whether each candidate host is answering, in the background.
 *
 * `/healthz` is served before the request pipeline that would otherwise
 * observe a node's health, so nothing else here knows whether a candidate is
 * reachable. Every host starts `false` and only becomes `true` on a successful
 * probe, so a poller that has not run, cannot run, or is failing leaves every
 * candidate down and steering off — degrading to the default behaviour by
 * construction rather than by a fallback branch.
 *
 * The probe never touches the request path: `isUp()` reads a boolean.
 */
export class TargetHealthMonitor {
	private readonly hosts: readonly string[];
	private readonly intervalMs: number;
	private readonly timeoutMs: number;
	private readonly probe: HealthzProbe;
	private readonly logger: Logger | undefined;
	private readonly up = new Map<string, boolean>();
	private timer: ReturnType<typeof setInterval> | undefined;

	constructor(options: TargetHealthMonitorOptions) {
		this.hosts = [...new Set(options.hosts)];
		this.intervalMs = options.intervalMs;
		this.timeoutMs = options.timeoutMs;
		this.probe = options.probe ?? fetchHealthzProbe;
		this.logger = options.logger;
	}

	isUp(host: string): boolean {
		return this.up.get(host) === true;
	}

	start(): void {
		if (this.timer !== undefined || this.hosts.length === 0) return;
		void this.pollAll();
		this.timer = setInterval(() => {
			void this.pollAll();
		}, this.intervalMs);
		// A background probe must never keep the process alive.
		this.timer.unref?.();
	}

	stop(): void {
		if (this.timer !== undefined) {
			clearInterval(this.timer);
			this.timer = undefined;
		}
	}

	/** One probe round over every candidate. Exposed so tests can await it. */
	async pollAll(): Promise<void> {
		await Promise.all(
			this.hosts.map(async (host: string): Promise<void> => {
				let healthy = false;
				try {
					healthy = await this.probe(host, this.timeoutMs);
				} catch {
					healthy = false;
				}
				const previous = this.up.get(host);
				this.up.set(host, healthy);
				if (previous !== healthy) {
					this.logger?.info(() => ({
						msg: "healthz geo target health changed",
						data: { host, healthy },
					}));
				}
			}),
		);
	}
}

/** The slice of the environment steering needs. */
export interface HealthzGeoEnv {
	ipInfoService: IIpInfoService;
	logger?: Logger;
}

/**
 * Picks the host `/healthz` should answer with. Pure apart from reading the
 * monitor's booleans and the memory-mapped country lookup — it never awaits
 * anything, so it cannot delay or fail a health check.
 */
export class HealthzGeoRouter {
	readonly enabled: boolean;
	private readonly routes: ReadonlyMap<string, string>;
	private readonly ipInfoService: IIpInfoService;
	private readonly monitor: TargetHealthMonitor;

	constructor(
		config: HealthzGeoConfig,
		env: HealthzGeoEnv,
		monitor?: TargetHealthMonitor,
	) {
		this.enabled = config.enabled;
		this.routes = config.routes;
		this.ipInfoService = env.ipInfoService;
		this.monitor =
			monitor ??
			new TargetHealthMonitor({
				hosts: [...new Set(config.routes.values())],
				intervalMs: config.probeIntervalMs,
				timeoutMs: config.probeTimeoutMs,
				logger: env.logger,
			});
	}

	start(): void {
		if (this.enabled) this.monitor.start();
	}

	stop(): void {
		this.monitor.stop();
	}

	resolveHost(
		clientIp: string | undefined,
		ownHost: string,
	): HealthzGeoDecision {
		if (!this.enabled) return { host: ownHost, outcome: "not_steered" };
		if (!clientIp) return { host: ownHost, outcome: "geo_unavailable" };

		// `isAvailable()` is false until the environment has finished becoming
		// ready. healthz answers before then — that is what makes it usable as a
		// liveness probe and as a deploy gate — so it must be read, never
		// awaited. Loopback and private-range callers (deploy gates, container
		// health checks) short-circuit inside `country()` and land here too.
		if (!this.ipInfoService.isAvailable()) {
			return { host: ownHost, outcome: "geo_unavailable" };
		}

		const country = this.ipInfoService.country(clientIp);
		if (!country) return { host: ownHost, outcome: "geo_unavailable" };

		const target = this.routes.get(country.toUpperCase());
		if (target === undefined || target === ownHost) {
			return { host: ownHost, outcome: "not_steered" };
		}

		if (!this.monitor.isUp(target)) {
			return { host: ownHost, outcome: "target_down" };
		}

		return { host: target, outcome: "steered" };
	}
}

// The router owns a background timer, so it is built once per process rather
// than once per router construction — the API is rebuilt on env changes and in
// tests, and each rebuild must not start another poller.
let cachedRouter: HealthzGeoRouter | undefined;

export const getHealthzGeoRouter = (env: HealthzGeoEnv): HealthzGeoRouter => {
	if (!cachedRouter) {
		cachedRouter = new HealthzGeoRouter(
			readHealthzGeoConfig(process.env, env.logger),
			env,
		);
		cachedRouter.start();
	}
	return cachedRouter;
};

/** Test-only: stop and drop the memoised router so config is re-read. */
export const resetHealthzGeoRouter = (): void => {
	cachedRouter?.stop();
	cachedRouter = undefined;
};
