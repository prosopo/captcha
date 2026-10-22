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

// Writes metrics-vectors.json: the Prometheus exposition after a fixed list of recordings, who
// metricsAccess lets scrape, how the request counter names routes, and /metrics and the
// request counter as the express app serves them. Run on Node 24.
import { writeFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import net from "node:net";
import { fileURLToPath } from "node:url";
import type { ProviderEnvironment } from "@prosopo/env";
import { getLogger } from "@prosopo/logger";
import { CaptchaType } from "@prosopo/types";
import type { IIpInfoService } from "@prosopo/types-env";
import cors from "cors";
import type { Request } from "express";
import express from "express";
import { resetHealthzGeoRouter } from "../../src/api/healthzGeo.js";
import {
	getMetrics,
	metricsAccess,
	metricsMiddleware,
	recordBlockedRequest,
	recordBotScore,
	recordCaptchaIssueError,
	recordCaptchaIssued,
	recordCaptchaVerify,
	recordDecoderOutcome,
	recordDetectorTriggered,
	recordDomainValidation,
	recordFrictionlessDecision,
	recordHealthzGeoOutcome,
	recordSpamEmail,
	setMaintenanceModeGauge,
} from "../../src/api/metrics.js";
import { publicRouter } from "../../src/api/public.js";
import { providerCorsOptions } from "../../src/api/startProviderApi.js";

if (!process.version.startsWith("v24.")) {
	throw new Error(`this generator must run on Node 24 (the production runtime), not ${process.version}`);
}

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

process.env.NODE_ENV = "production";
process.env.MAINTENANCE_MODE = "TRUE";
delete process.env.PROSOPO_METRICS_ENABLED;
delete process.env.PROSOPO_METRICS_TOKEN;
delete process.env.PROSOPO_METRICS_PUBLIC;

type Op =
	| { op: "issued" | "issueError"; type: CaptchaType }
	| { op: "verify"; type: CaptchaType; verified: boolean; source: "real" | "test_key" | "maintenance" | "cached" }
	| { op: "frictionless" | "blocked" | "domain" | "spam"; value: string }
	| { op: "botScore"; score: number }
	| { op: "detectors"; detectors: (string | number)[] }
	| { op: "geo"; outcome: "steered" | "not_steered" | "target_down" | "geo_unavailable" }
	| { op: "maintenance"; on: boolean }
	| { op: "decoder"; decoder: string; outcome: "ok" | "error"; seconds: number }
	| { op: "span"; span: "puzzle_background" | "puzzle_render" | "merkle_build" | "decision_machine_decide"; seconds: number }
	| { op: "http"; route: string; method: string; status: string; seconds: number }
	| { op: "redis"; general: boolean; uap: boolean };

const ops: Op[] = [
	{ op: "issued", type: CaptchaType.pow },
	{ op: "issued", type: CaptchaType.image },
	{ op: "issued", type: CaptchaType.pow },
	{ op: "issueError", type: CaptchaType.puzzle },
	{ op: "verify", type: CaptchaType.pow, verified: true, source: "real" },
	{ op: "verify", type: CaptchaType.pow, verified: false, source: "cached" },
	{ op: "verify", type: CaptchaType.image, verified: true, source: "test_key" },
	{ op: "verify", type: CaptchaType.pow, verified: true, source: "real" },
	{ op: "frictionless", value: "pow" },
	{ op: "frictionless", value: "image" },
	{ op: "botScore", score: 0 },
	{ op: "botScore", score: 0.1 },
	{ op: "botScore", score: 0.2 },
	{ op: "botScore", score: 0.35 },
	{ op: "botScore", score: 1 },
	{ op: "botScore", score: 12 },
	{ op: "botScore", score: -0.5 },
	{ op: "detectors", detectors: ["webdriver", 3, "webdriver"] },
	{ op: "blocked", value: 'quote " back \\ newline \n end' },
	{ op: "blocked", value: "ip" },
	{ op: "domain", value: "valid" },
	{ op: "spam", value: "spam" },
	{ op: "geo", outcome: "steered" },
	{ op: "geo", outcome: "target_down" },
	{ op: "maintenance", on: false },
	{ op: "decoder", decoder: "v1", outcome: "ok", seconds: 0.0003 },
	{ op: "decoder", decoder: "v1", outcome: "error", seconds: 2 },
	{ op: "decoder", decoder: "v2", outcome: "ok", seconds: 0.0001 },
	{ op: "span", span: "merkle_build", seconds: 0.0025 },
	{ op: "span", span: "merkle_build", seconds: 0.1 },
	{ op: "span", span: "puzzle_render", seconds: 1e-7 },
	{ op: "http", route: "/v1/prosopo/provider/client/captcha/pow", method: "POST", status: "200", seconds: 0.01 },
	{ op: "http", route: "other", method: "GET", status: "404", seconds: 0.30000000000000004 },
	{ op: "http", route: "/v1/prosopo/provider/client/captcha/pow", method: "POST", status: "200", seconds: 0.02 },
	{ op: "http", route: "/v1/prosopo/provider/client/captcha/pow", method: "POST", status: "400", seconds: 11 },
	{ op: "redis", general: true, uap: false },
];

const run = (op: Op): void => {
	const m = getMetrics();
	switch (op.op) {
		case "issued":
			return recordCaptchaIssued(op.type);
		case "issueError":
			return recordCaptchaIssueError(op.type);
		case "verify":
			return recordCaptchaVerify(op);
		case "frictionless":
			return recordFrictionlessDecision(op.value);
		case "blocked":
			return recordBlockedRequest(op.value);
		case "domain":
			return recordDomainValidation(op.value);
		case "spam":
			return recordSpamEmail(op.value);
		case "botScore":
			return recordBotScore(op.score);
		case "detectors":
			return recordDetectorTriggered(op.detectors);
		case "geo":
			return recordHealthzGeoOutcome(op.outcome);
		case "maintenance":
			return setMaintenanceModeGauge(op.on);
		case "decoder":
			return recordDecoderOutcome(op.decoder, op.outcome, op.seconds);
		case "span":
			// What measureSync records, with the time fixed.
			m.syncSpanCallsTotal.inc({ span: op.span });
			m.syncSpanWallSecondsTotal.inc({ span: op.span }, op.seconds);
			m.syncSpanDuration.observe({ span: op.span }, op.seconds);
			return;
		case "http": {
			// What metricsMiddleware records, with the time fixed.
			const labels = { route: op.route, method: op.method, status: op.status };
			m.httpRequestsTotal.inc(labels);
			m.httpRequestDuration.observe(labels, op.seconds);
			return;
		}
		case "redis":
			m.redisReady.set({ actor: "general" }, op.general ? 1 : 0);
			m.redisReady.set({ actor: "uap" }, op.uap ? 1 : 0);
			return;
	}
};

const blocks = async (): Promise<string[]> => (await getMetrics().registry.metrics()).split("\n\n");
const initial: string[] = await blocks();
for (const op of ops) run(op);
const exposition: string = await getMetrics().registry.metrics();

// ---------------------------------------------------------------- access

const ADDRESSES = ["::ffff:127.0.0.1", "127.0.0.1", "::1", "10.1.2.3", "::ffff:172.16.0.1", "172.32.0.1", "192.168.9.9", "::ffff:8.8.8.8", "8.8.8.8", "fd00::1", "fe80::1", "fec0::1", "2001:db8::1", "", "not-an-ip"];
const ACCESS_ENVS: Record<string, string>[] = [{}, { PROSOPO_METRICS_TOKEN: "s3cret" }, { PROSOPO_METRICS_PUBLIC: "true" }, { PROSOPO_METRICS_PUBLIC: "TRUE" }, { PROSOPO_METRICS_TOKEN: "s3cret", PROSOPO_METRICS_PUBLIC: "true" }, { PROSOPO_METRICS_TOKEN: "" }, { PROSOPO_METRICS_TOKEN: "é" }];
const ACCESS_HEADERS: Record<string, string>[] = [
	{},
	{ authorization: "Bearer s3cret" },
	{ authorization: "bearer s3cret" },
	{ authorization: "Bearer s3cret " },
	{ authorization: "Bearer s3cre" },
	{ authorization: "Bearer Ã©" },
	{ "x-forwarded-for": "1.2.3.4" },
	{ "x-forwarded-for": "" },
	{ forwarded: "for=1.2.3.4" },
	{ "x-real-ip": "1.2.3.4" },
	{ authorization: "Bearer s3cret", "x-forwarded-for": "1.2.3.4" },
];
const access: Json[] = [];
for (const env of ACCESS_ENVS) {
	for (const headers of ACCESS_HEADERS) {
		for (const address of ADDRESSES) {
			const req = { headers, socket: { remoteAddress: address === "" ? undefined : address } } as unknown as Request;
			access.push({ env, headers, address, status: metricsAccess(req, env) });
		}
	}
}

// ---------------------------------------------------------------- the app

const quiet = getLogger("error", "equivalence");
const request = (method: string, path: string, headers: [string, string][] = []): Buffer =>
	Buffer.from([`${method} ${path} HTTP/1.1`, "Host: h.example", ...headers.map(([name, value]) => `${name}: ${value}`), "Connection: close", "", ""].join("\r\n"), "latin1");
const send = (port: number, bytes: Buffer): Promise<Buffer> =>
	new Promise((resolve, reject) => {
		const chunks: Buffer[] = [];
		const socket = net.connect({ host: "127.0.0.1", port }, () => socket.write(bytes));
		socket.on("data", (chunk: Buffer) => chunks.push(chunk));
		socket.on("end", () => resolve(Buffer.concat(chunks)));
		socket.on("error", reject);
	});

// The counter's route names, and the scrape itself, through the provider's stack with
// metricsMiddleware after the public router.
const steps: { env: Record<string, string>; request: Buffer }[] = [
	{ env: {}, request: request("GET", "/v1/prosopo/provider/client/captcha/pow") },
	{ env: {}, request: request("POST", "/v1/prosopo/provider/client/captcha/pow") },
	{ env: {}, request: request("POST", "/v1/prosopo/provider/client/captcha/pow/") },
	{ env: {}, request: request("POST", "/V1/prosopo/provider/client/captcha/pow") },
	{ env: {}, request: request("PUT", "/v1/prosopo/provider/admin/sitekey/register?x=1") },
	{ env: {}, request: request("POST", "/healthz") },
	{ env: {}, request: request("DELETE", "/metrics") },
	{ env: {}, request: request("GET", "/nowhere") },
	{ env: {}, request: request("GET", "/a%2Fb") },
	{ env: {}, request: request("GET", "/healthz") },
	{ env: {}, request: request("GET", "/metrics", [["X-Forwarded-For", "1.2.3.4"]]) },
	{ env: { PROSOPO_METRICS_TOKEN: "s3cret" }, request: request("GET", "/metrics") },
	{ env: { PROSOPO_METRICS_TOKEN: "s3cret" }, request: request("HEAD", "/metrics", [["Authorization", "Bearer nope"]]) },
	{ env: {}, request: request("GET", "/METRICS/", [["X-Real-IP", "1.2.3.4"]]) },
	{ env: {}, request: request("GET", "/metrics") },
	{ env: { PROSOPO_METRICS_TOKEN: "s3cret" }, request: request("GET", "/metrics", [["Authorization", "Bearer s3cret"]]) },
	{ env: {}, request: request("HEAD", "/metrics") },
];

resetHealthzGeoRouter();
const env = {
	config: { host: "pronode1.prosopo.io" },
	logger: quiet,
	ipInfoService: { isAvailable: () => false, country: () => undefined } as unknown as IIpInfoService,
	getDb: () => {
		throw new Error("db not setup! Please call isReady() first");
	},
} as unknown as ProviderEnvironment;
const app = express();
app.set("trust proxy", 1);
app.use(cors(providerCorsOptions));
app.use(express.json({ limit: "1mb" }));
app.use(publicRouter(env));
app.use(metricsMiddleware());
const server = app.listen(0, "::");
await new Promise<void>((resolve) => server.once("listening", () => resolve()));
const port = (server.address() as AddressInfo).port;
const exchanges: Json[] = [];
for (const step of steps) {
	delete process.env.PROSOPO_METRICS_TOKEN;
	Object.assign(process.env, step.env);
	const response = await send(port, step.request);
	exchanges.push({ env: step.env, request: step.request.toString("base64"), response: response.toString("base64") });
}
await new Promise<void>((resolve) => server.close(() => resolve()));

writeFileSync(
	fileURLToPath(new URL("./metrics-vectors.json", import.meta.url)),
	`${JSON.stringify({ maintenanceModeEnv: process.env.MAINTENANCE_MODE, initial, ops, exposition, access, exchanges })}\n`,
);
console.log(`wrote metrics-vectors.json (${ops.length} recordings, ${access.length} access cases, ${exchanges.length} exchanges)`);
process.exit(0);
