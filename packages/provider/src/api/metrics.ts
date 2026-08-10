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

import type { ProviderEnvironment } from "@prosopo/env";
import {
	AdminApiPaths,
	type CaptchaType,
	ClientApiPaths,
	PublicApiPaths,
} from "@prosopo/types";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import {
	Counter,
	Gauge,
	Histogram,
	Registry,
	collectDefaultMetrics,
} from "prom-client";

// Whether the /metrics endpoint and instrumentation are active. Defaults to on;
// set PROSOPO_METRICS_ENABLED=false to disable. The endpoint only ever listens
// on the existing internal provider port and is scraped by vector over the
// docker network, so it is safe to leave enabled in production.
export const metricsEnabled = (): boolean =>
	process.env.PROSOPO_METRICS_ENABLED !== "false";

const PREFIX = "prosopo_";

// Latency buckets (seconds) shared by the duration histograms.
const LATENCY_BUCKETS = [
	0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10,
];
// Bot-score buckets. The score starts in 0..1 (0=human .. 1=bot) but language
// rules add unbounded per-language penalties on top, so it can exceed 1 — the
// upper buckets capture that tail rather than dumping it all into +Inf.
const SCORE_BUCKETS = [
	0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.5, 2, 3, 5, 10,
];

// The set of API paths we expose as the `route` label. Restricting to the known
// enum values keeps label cardinality bounded — anything unmatched is recorded
// as "other" rather than letting arbitrary URLs explode the series count.
const KNOWN_ROUTES = new Set<string>([
	...Object.values(ClientApiPaths),
	...Object.values(PublicApiPaths),
	...Object.values(AdminApiPaths),
]);

const normaliseRoute = (req: Request): string => {
	// req.path excludes the query string and, for these static API paths, never
	// contains path params, so it is naturally low-cardinality.
	const path = req.path;
	return KNOWN_ROUTES.has(path) ? path : "other";
};

// prom-client throws if the same metric name is registered twice. The reloader
// (ReloadingAPI) re-imports modules on env change, and tests construct the API
// repeatedly, so build everything once and memoise it on a module-level
// singleton rather than at import time.
interface ProviderMetrics {
	registry: Registry;
	httpRequestsTotal: Counter<"route" | "method" | "status">;
	httpRequestDuration: Histogram<"route" | "method" | "status">;
	captchaIssuedTotal: Counter<"type">;
	captchaIssueErrorsTotal: Counter<"type">;
	captchaVerifyTotal: Counter<"type" | "result" | "source">;
	frictionlessRoutedTotal: Counter<"decision">;
	botScore: Histogram<never>;
	detectorTriggeredTotal: Counter<"detector">;
	blockedRequestsTotal: Counter<"reason">;
	domainValidationTotal: Counter<"result">;
	spamEmailTotal: Counter<"result">;
	maintenanceMode: Gauge<never>;
	redisReady: Gauge<"actor">;
}

let metrics: ProviderMetrics | undefined;

const buildMetrics = (): ProviderMetrics => {
	const registry = new Registry();
	// process cpu/mem/gc/eventloop/handles
	collectDefaultMetrics({ register: registry, prefix: PREFIX });

	const httpRequestsTotal = new Counter({
		name: `${PREFIX}http_requests_total`,
		help: "Total HTTP requests handled by the provider API",
		labelNames: ["route", "method", "status"] as const,
		registers: [registry],
	});
	const httpRequestDuration = new Histogram({
		name: `${PREFIX}http_request_duration_seconds`,
		help: "Provider API request duration in seconds",
		labelNames: ["route", "method", "status"] as const,
		buckets: LATENCY_BUCKETS,
		registers: [registry],
	});
	const captchaIssuedTotal = new Counter({
		name: `${PREFIX}captcha_issued_total`,
		help: "Captcha challenges issued, by type",
		labelNames: ["type"] as const,
		registers: [registry],
	});
	const captchaIssueErrorsTotal = new Counter({
		name: `${PREFIX}captcha_issue_errors_total`,
		help: "Errors while issuing captcha challenges, by type",
		labelNames: ["type"] as const,
		registers: [registry],
	});
	const captchaVerifyTotal = new Counter({
		name: `${PREFIX}captcha_verify_total`,
		help: "Captcha verification outcomes, by type/result/source",
		labelNames: ["type", "result", "source"] as const,
		registers: [registry],
	});
	const frictionlessRoutedTotal = new Counter({
		name: `${PREFIX}frictionless_routed_total`,
		help: "Frictionless routing decisions (which captcha the user was sent to)",
		labelNames: ["decision"] as const,
		registers: [registry],
	});
	const botScore = new Histogram({
		name: `${PREFIX}bot_score`,
		help: "Distribution of frictionless bot scores (0=human .. 1=bot; language-rule penalties can push it above 1)",
		buckets: SCORE_BUCKETS,
		registers: [registry],
	});
	const detectorTriggeredTotal = new Counter({
		name: `${PREFIX}detector_triggered_total`,
		help: "Count of times each bot detector was triggered",
		labelNames: ["detector"] as const,
		registers: [registry],
	});
	const blockedRequestsTotal = new Counter({
		name: `${PREFIX}blocked_requests_total`,
		help: "Requests blocked before reaching a captcha handler, by reason",
		labelNames: ["reason"] as const,
		registers: [registry],
	});
	const domainValidationTotal = new Counter({
		name: `${PREFIX}domain_validation_total`,
		help: "Domain/site-key validation outcomes",
		labelNames: ["result"] as const,
		registers: [registry],
	});
	const spamEmailTotal = new Counter({
		name: `${PREFIX}spam_email_total`,
		help: "Spam email-domain check outcomes",
		labelNames: ["result"] as const,
		registers: [registry],
	});
	const maintenanceMode = new Gauge({
		name: `${PREFIX}maintenance_mode`,
		help: "1 when the provider is in maintenance mode, else 0",
		registers: [registry],
	});
	// Seed from the env default so the series is always present from boot and
	// reflects MAINTENANCE_MODE even before the admin toggle is ever called.
	maintenanceMode.set(
		process.env.MAINTENANCE_MODE?.toLowerCase() === "true" ? 1 : 0,
	);
	const redisReady = new Gauge({
		name: `${PREFIX}redis_ready`,
		help: "1 when the given redis connection is ready, else 0",
		labelNames: ["actor"] as const,
		registers: [registry],
	});

	return {
		registry,
		httpRequestsTotal,
		httpRequestDuration,
		captchaIssuedTotal,
		captchaIssueErrorsTotal,
		captchaVerifyTotal,
		frictionlessRoutedTotal,
		botScore,
		detectorTriggeredTotal,
		blockedRequestsTotal,
		domainValidationTotal,
		spamEmailTotal,
		maintenanceMode,
		redisReady,
	};
};

export const getMetrics = (): ProviderMetrics => {
	if (!metrics) {
		metrics = buildMetrics();
	}
	return metrics;
};

// ---------------------------------------------------------------------------
// Recording helpers — call these from handlers/middleware. Each guards on
// metricsEnabled() so instrumentation is a no-op (and never throws) when
// metrics are disabled.
// ---------------------------------------------------------------------------

export const recordCaptchaIssued = (type: CaptchaType): void => {
	if (!metricsEnabled()) return;
	getMetrics().captchaIssuedTotal.inc({ type });
};

export const recordCaptchaIssueError = (type: CaptchaType): void => {
	if (!metricsEnabled()) return;
	getMetrics().captchaIssueErrorsTotal.inc({ type });
};

export const recordCaptchaVerify = (args: {
	type: CaptchaType;
	verified: boolean;
	source: "real" | "test_key" | "maintenance" | "cached";
}): void => {
	if (!metricsEnabled()) return;
	getMetrics().captchaVerifyTotal.inc({
		type: args.type,
		result: args.verified ? "verified" : "failed",
		source: args.source,
	});
};

export const recordFrictionlessDecision = (decision: string): void => {
	if (!metricsEnabled()) return;
	getMetrics().frictionlessRoutedTotal.inc({ decision });
};

export const recordBotScore = (score: number): void => {
	if (!metricsEnabled()) return;
	getMetrics().botScore.observe(score);
};

export const recordDetectorTriggered = (
	detectors: Array<string | number>,
): void => {
	if (!metricsEnabled()) return;
	const m = getMetrics();
	for (const detector of detectors) {
		m.detectorTriggeredTotal.inc({ detector: String(detector) });
	}
};

export const recordBlockedRequest = (reason: string): void => {
	if (!metricsEnabled()) return;
	getMetrics().blockedRequestsTotal.inc({ reason });
};

export const recordDomainValidation = (result: string): void => {
	if (!metricsEnabled()) return;
	getMetrics().domainValidationTotal.inc({ result });
};

export const recordSpamEmail = (result: string): void => {
	if (!metricsEnabled()) return;
	getMetrics().spamEmailTotal.inc({ result });
};

export const setMaintenanceModeGauge = (on: boolean): void => {
	if (!metricsEnabled()) return;
	getMetrics().maintenanceMode.set(on ? 1 : 0);
};

// ---------------------------------------------------------------------------
// Express integration
// ---------------------------------------------------------------------------

// Times every request and records count + duration labelled by route/method/
// status. Mount this AFTER the public router so the /metrics scrape itself is
// not counted.
export const metricsMiddleware = (): RequestHandler => {
	return (req: Request, res: Response, next: NextFunction) => {
		if (!metricsEnabled()) return next();
		const start = process.hrtime.bigint();
		res.on("finish", () => {
			const route = normaliseRoute(req);
			const labels = {
				route,
				method: req.method,
				status: String(res.statusCode),
			};
			const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;
			const m = getMetrics();
			m.httpRequestsTotal.inc(labels);
			m.httpRequestDuration.observe(labels, durationSeconds);
		});
		next();
	};
};

// Serves the Prometheus exposition. Refreshes the redis-readiness gauges from
// the live DB connections at scrape time so they reflect current state.
//
// The endpoint is intended for the internal docker network (vector scrapes it),
// so it is unauthenticated by default. Set PROSOPO_METRICS_TOKEN to require an
// `Authorization: Bearer <token>` header — use this if the provider port is
// reachable outside the internal network.
export const metricsHandler = (env: ProviderEnvironment): RequestHandler => {
	return async (req: Request, res: Response) => {
		const token = process.env.PROSOPO_METRICS_TOKEN;
		if (token && req.headers.authorization !== `Bearer ${token}`) {
			res.status(401).send("Unauthorized");
			return;
		}
		const m = getMetrics();
		try {
			const db = env.getDb();
			m.redisReady.set(
				{ actor: "general" },
				db.getRedisConnection().isReady() ? 1 : 0,
			);
			m.redisReady.set(
				{ actor: "uap" },
				db.getRedisAccessRulesConnection().isReady() ? 1 : 0,
			);
		} catch {
			// DB unavailable (e.g. maintenance mode / startup / connection down):
			// report not-ready rather than leaving the gauges at a stale "ready",
			// and still serve the rest of the metrics rather than failing the scrape.
			m.redisReady.set({ actor: "general" }, 0);
			m.redisReady.set({ actor: "uap" }, 0);
		}
		res.set("Content-Type", m.registry.contentType);
		res.end(await m.registry.metrics());
	};
};
