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

// What the live equivalence generators share: a provider environment on the local MongoDB
// (127.0.0.1:${PROSOPO_TEST_MONGO_PORT:-27999}, user root/root) and Redis Stack
// (localhost:6379, password root), both emptied first; a stand-in for ipapi.is answering from a
// table; the stores dumped so the Rust side can start from the same state; and raw HTTP.
import http from "node:http";
import type { AddressInfo } from "node:net";
import net from "node:net";
import { ProviderEnvironment } from "@prosopo/env";
import { getPair } from "@prosopo/keyring";
import { getLogger } from "@prosopo/logger";
import { type RedisConnection, connectToRedis } from "@prosopo/redis-client";
import mongoose from "mongoose";
import getConfig from "../../../cli/src/prosopo.config.js";

const { MongoClient, BSON } = mongoose.mongo;

const redis = (): RedisConnection => connectToRedis({ url: REDIS_URL, password: REDIS_PASSWORD, logger: getLogger("error", "equivalence") });

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

export const MNEMONIC = "bottom drive obey lake curtain smoke basket hold race lonely fit walk";
export const ADMIN = "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty";
export const MONGO_PORT = process.env.PROSOPO_TEST_MONGO_PORT ?? "27999";
export const MONGO_URL = `mongodb://root:root@127.0.0.1:${MONGO_PORT}/?authSource=admin`;
export const REDIS_URL = "redis://localhost:6379";
export const REDIS_PASSWORD = "root";

/** ipapi.is's answers, by IP. An IP not in the table is answered as a bogon. */
export type IpapiTable = Record<string, Json>;

export const fakeIpapi = async (table: IpapiTable): Promise<{ url: string; close: () => Promise<void> }> => {
	const server = http.createServer((req, res) => {
		const chunks: Buffer[] = [];
		req.on("data", (chunk: Buffer) => chunks.push(chunk));
		req.on("end", () => {
			const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}") as { q?: string };
			const answer = (body.q !== undefined && table[body.q]) || { ip: body.q ?? null, is_bogon: true };
			res.setHeader("Content-Type", "application/json");
			res.end(JSON.stringify(answer));
		});
	});
	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
	const port = (server.address() as AddressInfo).port;
	return {
		url: `http://127.0.0.1:${port}/`,
		close: () => new Promise<void>((resolve) => server.close(() => resolve())),
	};
};

/** The variables a live provider runs with, over `extra`. */
export const liveVariables = (database: string, ipapiUrl: string, extra: Record<string, string> = {}): Record<string, string> => ({
	CADDY_DOMAIN: "pronode1.prosopo.io",
	PROSOPO_DEFAULT_ENVIRONMENT: "development",
	PROSOPO_IPAPI_KEY: "k",
	PROSOPO_IPAPI_URL: ipapiUrl,
	PROSOPO_PROVIDER_MNEMONIC: MNEMONIC,
	PROSOPO_ADMIN_ADDRESS: ADMIN,
	PROSOPO_DATABASE_HOST: "127.0.0.1",
	PROSOPO_DATABASE_PORT: MONGO_PORT,
	PROSOPO_DATABASE_NAME: database,
	PROSOPO_DATABASE_AUTH_SOURCE: "admin",
	REDIS_CONNECTION_URL: REDIS_URL,
	REDIS_CONNECTION_PASSWORD: REDIS_PASSWORD,
	PROSOPO_API_PORT: "0",
	...extra,
});

/** The database dropped and Redis emptied, so a run starts from nothing. */
export const resetStores = async (database: string): Promise<void> => {
	const mongo = new MongoClient(MONGO_URL);
	await mongo.connect();
	await mongo.db(database).dropDatabase();
	await mongo.close();
	const client = await redis().getClient();
	await client.flushAll();
	await client.quit();
};

/** A ready provider environment over the live stores, configured from `variables`. */
export const liveEnvironment = async (variables: Record<string, string>): Promise<ProviderEnvironment> => {
	Object.assign(process.env, variables);
	const config = getConfig();
	const env = new ProviderEnvironment(config, getPair(MNEMONIC), getPair(undefined, ADMIN));
	await env.isReady();
	return env;
};

/** Every Redis hash, by key, fields in the order HGETALL gives them. */
export const dumpRedisHashes = async (): Promise<Json> => {
	const client = await redis().getClient();
	const keys = (await client.keys("*")).sort();
	const out: Json[] = [];
	for (const key of keys) {
		if ((await client.type(key)) === "hash") {
			out.push({ key, fields: (await client.hGetAll(key)) as Json });
		}
	}
	await client.quit();
	return out;
};

/** A collection's documents in insertion order, as canonical extended JSON. */
export const dumpCollection = async (database: string, collection: string): Promise<Json> => {
	const mongo = new MongoClient(MONGO_URL);
	await mongo.connect();
	const documents = await mongo.db(database).collection(collection).find({}).sort({ _id: 1 }).toArray();
	await mongo.close();
	return documents.map((document) => JSON.parse(BSON.EJSON.stringify(document, { relaxed: false })) as Json);
};

export const send = (port: number, bytes: Buffer): Promise<Buffer> =>
	new Promise((resolve, reject) => {
		const chunks: Buffer[] = [];
		const socket = net.connect({ host: "127.0.0.1", port }, () => socket.write(bytes));
		socket.on("data", (chunk: Buffer) => chunks.push(chunk));
		socket.on("end", () => resolve(Buffer.concat(chunks)));
		socket.on("error", reject);
	});

export interface Step {
	method: string;
	path: string;
	headers?: [string, string][];
	body?: string;
	compare?: boolean;
}

export const requestBytes = (step: Step): Buffer => {
	const headers = [...(step.headers ?? [])];
	if (step.body !== undefined) headers.push(["Content-Length", String(Buffer.byteLength(step.body))]);
	return Buffer.from([`${step.method} ${step.path} HTTP/1.1`, "Host: h.example", ...headers.map(([n, v]) => `${n}: ${v}`), "Connection: close", "", step.body ?? ""].join("\r\n"), "latin1");
};

/** A minimal TLS ClientHello record, as the JA4 vectors build them. */
export const clientHello = (version: number, ciphers: number[], extensions: { id: number; data: Buffer }[]): Buffer => {
	const u16 = (n: number) => Buffer.from([(n >> 8) & 0xff, n & 0xff]);
	const exts = Buffer.concat(extensions.flatMap((ext) => [u16(ext.id), u16(ext.data.length), ext.data]));
	const body = Buffer.concat([u16(version), Buffer.alloc(32, 0xaa), Buffer.from([0]), u16(ciphers.length * 2), ...ciphers.map(u16), Buffer.from([1, 0]), u16(exts.length), exts]);
	const handshake = Buffer.concat([Buffer.from([0x01, (body.length >> 16) & 0xff, (body.length >> 8) & 0xff, body.length & 0xff]), body]);
	return Buffer.concat([Buffer.from([0x16, 0x03, 0x01]), u16(handshake.length), handshake]);
};

export const sni = (host: string): Buffer => {
	const name = Buffer.from(host, "ascii");
	return Buffer.concat([Buffer.from([0, name.length + 3, 0, 0, name.length]), name]);
};

export const alpn = (protocols: string[]): Buffer => {
	const list = Buffer.concat(protocols.map((p) => Buffer.concat([Buffer.from([p.length]), Buffer.from(p, "ascii")])));
	return Buffer.concat([Buffer.from([0, list.length]), list]);
};
