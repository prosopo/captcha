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

// Writes app-vectors.json: the client example server's express app (createApp and its routes,
// on a live MongoDB, see packages/provider/rust/equivalence/live-harness.ts), sent raw HTTP
// requests in API mode, against a stand-in siteverify endpoint, and in library mode, against a
// stand-in provider. Each exchange records the request, the answer, the time it was sent, the
// stored users and counters after it, and what each stand-in received. Run on Node 24.
import { writeFileSync } from "node:fs";
import { type IncomingMessage, type Server, type ServerResponse, createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { fileURLToPath } from "node:url";
import { getPair } from "@prosopo/keyring";
import { getServerConfig } from "@prosopo/server";
import { ApiParams, CaptchaType, decodeProcaptchaOutput, encodeProcaptchaOutput } from "@prosopo/types";
import jwt from "jsonwebtoken";
import {
	type Json,
	MONGO_PORT,
	dumpDatabase,
	requestBytes,
	send,
	withMongo,
} from "../../../../packages/provider/rust/equivalence/live-harness.js";
import { createApp } from "../../src/app.js";
import routesFactory from "../../src/routes/routes.js";
import connectionFactory from "../../src/utils/connection.js";

if (!process.version.startsWith("v24.")) {
	throw new Error(`this generator must run on Node 24 (the production runtime), not ${process.version}`);
}

const DATABASE = "equivalence_client_example";
const MNEMONIC = "bottom drive obey lake curtain smoke basket hold race lonely fit walk";
const SITE_KEY = getPair(MNEMONIC).address;
const POW_SITE_KEY = getPair(`${MNEMONIC}//pow`).address;
const UNMATCHED_SITE_KEY = getPair("//Dave").address;
const BOB = getPair("//Bob");
const CHARLIE = getPair("//Charlie");

// Fixed, because the tokens name the provider's URL and the Rust replay must stand in at it.
const PROVIDER_PORT = 28131;
const SITEVERIFY_PORT = 28132;

const listen = async (server: Server, port = 0): Promise<string> => {
	await new Promise<void>((resolve) => server.listen(port, "127.0.0.1", () => resolve()));
	return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
};
const readBody = (req: IncomingMessage): Promise<string> =>
	new Promise((resolve) => {
		const chunks: Buffer[] = [];
		req.on("data", (chunk: Buffer) => chunks.push(chunk));
		req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
	});

type Received = { method: string; url: string; contentType: string | null; body: string };
const received: Received[] = [];
const record = async (req: IncomingMessage): Promise<Received> => {
	const entry = { method: req.method ?? "", url: req.url ?? "", contentType: req.headers["content-type"] ?? null, body: await readBody(req) };
	received.push(entry);
	return entry;
};

// siteverify answers by token: verified, refused, not JSON, or a verdict that is not a boolean.
const siteverifyAnswers: Record<string, string> = {
	"0x01": JSON.stringify({ verified: true, status: "ok" }),
	"0x02": JSON.stringify({ verified: false, status: "no" }),
	"0x03": "not json",
	"0x04": JSON.stringify({ verified: "yes" }),
};
const siteverify = createServer(async (req: IncomingMessage, res: ServerResponse) => {
	const { body } = await record(req);
	const token = (JSON.parse(body) as Record<string, string>)[ApiParams.token] ?? "";
	res.setHeader("Content-Type", "application/json");
	res.end(siteverifyAnswers[token] ?? JSON.stringify({ verified: false }));
});
const siteverifyUrl = `${await listen(siteverify, SITEVERIFY_PORT)}/siteverify`;

// The provider verifies Bob and nobody else.
const provider = createServer(async (req: IncomingMessage, res: ServerResponse) => {
	const { body } = await record(req);
	const token = (JSON.parse(body) as Record<string, string>)[ApiParams.token] ?? "";
	const user = decodeProcaptchaOutput(token)[ApiParams.user];
	res.setHeader("Content-Type", "application/json");
	res.end(JSON.stringify({ status: "ok", verified: user === BOB.address }));
});
const providerUrl = await listen(provider, PROVIDER_PORT);

const variables: Record<string, string> = {
	NODE_ENV: "production",
	PROSOPO_SITE_KEY: SITE_KEY,
	PROSOPO_SITE_PRIVATE_KEY: MNEMONIC,
	PROSOPO_SERVER_URL: "http://localhost",
	PROSOPO_SERVER_PORT: "9228",
	PROSOPO_DEFAULT_ENVIRONMENT: "development",
	PROSOPO_PROVIDER_LIST: providerUrl,
};
Object.assign(process.env, variables);
const config = getServerConfig();

await withMongo((mongo) => mongo.db(DATABASE).dropDatabase());
const uri = `mongodb://root:root@127.0.0.1:${MONGO_PORT}/${DATABASE}?authSource=admin`;
const connection = connectionFactory(uri);
const serve = async (verifyType: string): Promise<number> => {
	const app = createApp();
	app.use(routesFactory(connection, config, siteverifyUrl, verifyType));
	const server = createServer(app);
	await listen(server);
	return (server.address() as AddressInfo).port;
};
const ports: Record<string, number> = { api: await serve("api"), local: await serve("local") };

const powToken = (user: string, url: string = providerUrl): string =>
	encodeProcaptchaOutput({
		[ApiParams.providerUrl]: url,
		[ApiParams.dapp]: SITE_KEY,
		[ApiParams.user]: user,
		[ApiParams.challenge]: `${Date.now()}___${user}___${SITE_KEY}___0`,
		[ApiParams.nonce]: 7,
		[ApiParams.timestamp]: String(Date.now()),
		[ApiParams.signature]: { [ApiParams.provider]: { [ApiParams.challenge]: "0xprovider" }, [ApiParams.user]: { [ApiParams.timestamp]: "0xuser" } },
		[ApiParams.captchaType]: CaptchaType.pow,
	});

const json = (body: unknown): { headers: [string, string][]; body: string } => ({
	headers: [["Content-Type", "application/json"]],
	body: JSON.stringify(body),
});
const signupBody = (email: string, token: string, siteKey: string = SITE_KEY, extra: Record<string, unknown> = {}) => ({
	email,
	password: "hunter2",
	name: "A Name",
	[ApiParams.siteKey]: siteKey,
	[ApiParams.procaptchaResponse]: token,
	...extra,
});

type Step = { app: string; method: string; path: string; headers?: [string, string][]; body?: string };
const post = (app: string, path: string, body: unknown, headers: [string, string][] = []): Step => {
	const encoded = json(body);
	return { app, method: "POST", path, headers: [...encoded.headers, ...headers], body: encoded.body };
};
const bearer = (value: string): Step => ({ app: "api", method: "GET", path: "/private", headers: [["Authorization", value]] });
const seedSteps: Step[] = [post("api", "/signup", signupBody("seed@example.com", "0x01"))];
const valid = jwt.sign({ email: "seed@example.com" }, "secret", { expiresIn: "3650d" });
const expired = jwt.sign({ email: "seed@example.com", exp: 1000 }, "secret");
const otherSecret = jwt.sign({ email: "seed@example.com" }, "other", { expiresIn: "1h" });
const steps: Step[] = [
	{ app: "api", method: "GET", path: "/public" },
	{ app: "api", method: "GET", path: "/health" },
	{ app: "api", method: "GET", path: "/public", headers: [["Origin", "https://site.example"]] },
	{ app: "api", method: "OPTIONS", path: "/signup", headers: [["Origin", "https://site.example"], ["Access-Control-Request-Method", "POST"], ["Access-Control-Request-Headers", "content-type,x-extra"]] },
	{ app: "api", method: "OPTIONS", path: "/signup" },
	{ app: "api", method: "GET", path: "/nope" },
	{ app: "api", method: "GET", path: "/signup" },
	{ app: "api", method: "HEAD", path: "/public" },
	{ app: "api", method: "GET", path: "/public", headers: [["If-None-Match", 'W/"2a-TqkAVSLjPJS7BbsLy+6/hyztrjs"']] },
	post("api", "/signup", signupBody("one@example.com", "0x01")),
	post("api", "/signup", signupBody("one@example.com", "0x01")),
	post("api", "/signup", signupBody("two@example.com", "0x02")),
	post("api", "/signup", signupBody("three@example.com", "0x04")),
	post("api", "/signup", signupBody("four@example.com", "0x01", POW_SITE_KEY)),
	post("api", "/signup", signupBody("five@example.com", "0x01", UNMATCHED_SITE_KEY)),
	post("api", "/signup", signupBody("six@example.com", "0x01"), [["X-Client-Ip", "203.0.113.9"]]),
	post("api", "/signup", signupBody("not-an-email", "0x01")),
	post("api", "/signup", signupBody("seven@example.com", "no-prefix")),
	post("api", "/signup", { email: "eight@example.com" }),
	{ app: "api", method: "POST", path: "/signup", headers: [["Content-Type", "application/x-www-form-urlencoded"]], body: `email=form%40example.com&password=pw&siteKey=${SITE_KEY}&procaptcha-response=0x01` },
	{ app: "api", method: "POST", path: "/signup", headers: [["Content-Type", "application/json"]], body: "{not json" },
	post("api", "/signup", signupBody("name-number@example.com", "0x01", SITE_KEY, { name: 42 })),
	post("api", "/signup", signupBody("name-null@example.com", "0x01", SITE_KEY, { name: null })),
	post("api", "/signup", signupBody("name-bool@example.com", "0x01", SITE_KEY, { name: true })),
	post("api", "/signup", signupBody("name-object@example.com", "0x01", SITE_KEY, { name: { first: "A" } })),
	post("api", "/signup", { ...signupBody("x@example.com", "0x01"), email: { $ne: null } }),
	post("api", "/signup", signupBody("big@example.com", "0x01", SITE_KEY, { name: "n".repeat(110_000) })),
	{ app: "api", method: "POST", path: "/signup", headers: [["Content-Type", "application/x-www-form-urlencoded"]], body: `email=repeat%40example.com&email=again%40example.com&password=pw&siteKey=${SITE_KEY}&procaptcha-response=0x01` },
	{ app: "api", method: "POST", path: "/signup", headers: [["Content-Type", "application/x-www-form-urlencoded"]], body: `email=plus+sign%40example.com&password=a+b%2Bc&name=%E2%9C%93&siteKey=${SITE_KEY}&procaptcha-response=0x01` },
	post("api", "/login", { email: "nobody@example.com", [ApiParams.procaptchaResponse]: "0x01" }),
	post("api", "/login", { ...signupBody("seed@example.com", "0x01") }),
	post("api", "/login", { ...signupBody("seed@example.com", "0x01"), password: "wrong" }),
	post("api", "/login", { ...signupBody("seed@example.com", "0x02") }),
	post("api", "/login", { ...signupBody("seed@example.com", "0x04") }),
	post("api", "/login", { email: "seed@example.com", password: "hunter2" }),
	post("api", "/login", { password: "hunter2", [ApiParams.procaptchaResponse]: "0x01" }),
	post("api", "/login", { email: { $ne: null }, password: "hunter2", [ApiParams.procaptchaResponse]: "0x01" }),
	post("api", "/login", { ...signupBody("one@example.com", "0x01") }, [["X-Client-Ip", "198.51.100.4"]]),
	bearer(""),
	bearer("Bearer"),
	bearer("Bearer "),
	bearer(`Bearer ${valid}`),
	bearer(`Bearer ${valid} trailing`),
	bearer(`Bearer ${expired}`),
	bearer(`Bearer ${otherSecret}`),
	bearer("Bearer abc"),
	bearer("Bearer a.b.c"),
	post("local", "/signup", signupBody("bob@example.com", powToken(BOB.address), SITE_KEY, { [ApiParams.clientSessionId]: "session-1" }), [["X-Client-Ip", "203.0.113.10"]]),
	post("local", "/signup", signupBody("charlie@example.com", powToken(CHARLIE.address))),
	post("local", "/signup", signupBody("lost@example.com", powToken(BOB.address, "https://unknown.example"))),
	post("local", "/signup", signupBody("broken@example.com", "0x00")),
	post("local", "/login", { ...signupBody("bob@example.com", powToken(BOB.address)), [ApiParams.clientSessionId]: "session-2" }),
	post("local", "/login", { ...signupBody("bob@example.com", powToken(CHARLIE.address)) }),
];

const shown = (bytes: Buffer): string => bytes.toString("latin1");
const exchange = async (step: Step): Promise<Json> => {
	const sent = received.length;
	const at = Date.now();
	const request = requestBytes(step);
	const response = await send(ports[step.app] as number, request);
	return {
		app: step.app,
		at,
		request: shown(request),
		response: shown(response),
		received: received.slice(sent) as unknown as Json,
		after: await dumpDatabase(DATABASE),
	};
};

const seedExchanges: Json[] = [];
for (const step of seedSteps) seedExchanges.push(await exchange(step));
const seed = await dumpDatabase(DATABASE);
const exchanges: Json[] = [];
for (const step of steps) exchanges.push(await exchange(step));

await connection.close();
await new Promise<void>((resolve) => siteverify.close(() => resolve()));
await new Promise<void>((resolve) => provider.close(() => resolve()));

writeFileSync(
	fileURLToPath(new URL("./app-vectors.json", import.meta.url)),
	`${JSON.stringify({ database: DATABASE, variables, siteverifyUrl, providerPort: PROVIDER_PORT, siteverifyPort: SITEVERIFY_PORT, seedExchanges, seed, exchanges }, null, "\t")}\n`,
);
console.log(`wrote app-vectors.json (${exchanges.length} exchanges)`);
process.exit(0);
