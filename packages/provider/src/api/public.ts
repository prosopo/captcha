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

import { handleErrors } from "@prosopo/api-express-router";
import { ProsopoApiError } from "@prosopo/common";
import type { ProviderEnvironment } from "@prosopo/env";
import {
	HealthApiPaths,
	type HealthResponse,
	type ProviderDetails,
	PublicApiPaths,
} from "@prosopo/types";
import { version } from "@prosopo/util";
import express, { type Router } from "express";
import { getHealthzGeoRouter } from "./healthzGeo.js";
import {
	metricsEnabled,
	metricsHandler,
	recordHealthzGeoOutcome,
} from "./metrics.js";

/**
 * Returns a router connected to the database which can interact with the Proposo protocol
 *
 * @return {Router} - A middleware router that can interact with the Prosopo protocol
 */
export function publicRouter(env: ProviderEnvironment): Router {
	const router = express.Router();

	// Built here rather than per request so the target health poller starts
	// with the API and has converged before real traffic arrives. It is a
	// no-op, and starts nothing, when steering is off.
	const geo = getHealthzGeoRouter(env);

	// The `host` field is the per-pronode identity (e.g. `pronode4.prosopo.io`).
	// Clients hit `pronode.prosopo.io/healthz` to discover which pronode the
	// DNS layer picked, then pin all subsequent captcha calls to that host so
	// session creation and submission land on the same backend. `config.host`
	// is set per-pronode via ansible inventory (CADDY_DOMAIN). Falls back to
	// the request's Host header in the rare case it's unset.
	//
	// Optionally the answer is the node the CALLER's country maps to instead —
	// see `healthzGeo.ts`. Off by default; when off this handler behaves
	// exactly as it did before, including sending no cache headers.
	router.get(PublicApiPaths.Healthz, (req, res) => {
		const ownHost =
			env.config.host && env.config.host.length > 0
				? env.config.host
				: req.hostname;

		if (!geo.enabled) {
			return res.status(200).json({ ok: true, host: ownHost });
		}

		// The answer now varies per caller, so no intermediary may cache and
		// replay it — that would hand one client another client's pin. Set
		// before the decision so it covers every branch, including the
		// fallbacks. The widget already sends `cache: "no-store"`, but that
		// only binds the browser.
		res.set("Cache-Control", "no-store, private");

		const decision = geo.resolveHost(req.ip, ownHost);
		recordHealthzGeoOutcome(decision.outcome);
		return res.status(200).json({ ok: true, host: decision.host });
	});

	// Prometheus metrics endpoint. Lives in the public router so it runs before
	// rate-limiting, auth and blocking middleware — scrapes are never throttled
	// or blocked. Vector scrapes this over the internal docker network.
	if (metricsEnabled()) {
		router.get(PublicApiPaths.Metrics, metricsHandler(env));
	}

	router.get(HealthApiPaths.Health, (req, res) => {
		const response: HealthResponse = {
			alive: true,
			timestamp: new Date().toISOString(),
		};
		res.json(response);
	});

	/**
	 * Gets public details of the provider
	 */
	router.get(PublicApiPaths.GetProviderDetails, async (req, res, next) => {
		try {
			const db = env.getDb();

			const redisConnection = db.getRedisConnection();
			const redisAccessRulesConnection = db.getRedisAccessRulesConnection();

			// Identity of the node answering this request, so callers can tell
			// which node they reached without relying on /healthz.
			const host =
				env.config.host && env.config.host.length > 0
					? env.config.host
					: req.hostname;

			const response: ProviderDetails = {
				version,
				message: "Provider online",
				host,
				redis: [
					{
						actor: "General",
						isReady: redisConnection.isReady(),
						awaitingTimeSeconds: Math.ceil(
							redisConnection.getAwaitingTimeMs() / 1000,
						),
					},
					{
						actor: "UAP",
						isReady: redisAccessRulesConnection.isReady(),
						awaitingTimeSeconds: Math.ceil(
							redisAccessRulesConnection.getAwaitingTimeMs() / 1000,
						),
					},
				],
			};

			return res.json(response);
		} catch (err) {
			env.logger.error(() => ({
				err,
				data: { reqParams: req.params },
				msg: "Error getting provider details",
			}));
			return next(
				new ProsopoApiError("API.BAD_REQUEST", {
					context: { code: 500 },
				}),
			);
		}
	});

	// Your error handler should always be at the end of your application stack. Apparently it means not only after all
	// app.use() but also after all your app.get() and app.post() calls.
	// https://stackoverflow.com/a/62358794/1178971
	router.use(handleErrors);

	return router;
}
