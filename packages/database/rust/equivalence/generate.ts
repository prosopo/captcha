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

// Records the database package's connection setup into vectors.json, which equivalence.rs replays
// against the Rust: which compressors a URL gets, the connection options, and the URL, database
// name and masked URL a MongoDatabase builds from its constructor arguments.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { getLogger } from "@prosopo/logger";
import { MongoDatabase } from "../../src/base/mongo.js";
import { type MongoCompressor, getMongoCompressors, getMongoConnectionOptions } from "../../src/mongooseOptions.js";

if (!process.version.startsWith("v24.")) {
	throw new Error(`this generator must run on Node 24 (the production runtime), not ${process.version}`);
}

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

const URLS: string[] = [
	"",
	"   ",
	"mongodb://",
	"not-a-url",
	"mongodb://127.0.0.1:27017",
	"mongodb://localhost",
	"mongodb://localhost:27017/db",
	"mongodb://LOCALHOST/db",
	"mongodb://[::1]:27017/db",
	"mongodb://::1:27017/db",
	"mongodb://[bad",
	"mongodb://database:27017/db",
	"mongodb://container-name/db",
	"mongodb://user:pass@example.com:27017/db",
	"mongodb://user:p%40ss@example.com/db?retryWrites=true&w=majority",
	"mongodb://admin:S3cr3t-Pass+x@db.example:27017",
	"mongodb://user@host.example/db",
	"mongodb+srv://svc:a.b.c@cluster0.example.net/?authSource=admin",
	"mongodb+srv://cluster.mongodb.net/db",
	"mongodb://192.168.1.1:27017/db",
	"mongodb://[2001:0db8::1]:27017/db",
	"mongodb://[::ffff:192.168.1.1]:27017/db",
	"mongodb://MiXeD.Example.COM/Db",
	"mongodb://h1:1,h2:2/db",
	"mongodb://host.example/db?a=b+c&d=%20&e=&f",
	"mongodb://host.example:27017/",
	"mongodb://host.example:27017/existing/path",
	"mongodb://host.example/db#frag",
	"mongodb://host.example:99999/db",
	"mongodb://hôst.example/db",
	"MONGODB://HOST.EXAMPLE/db",
	"redis://host.example/db",
	"mongodb://host.example/db?authSource=old",
];
const COMPRESSOR_LISTS: (MongoCompressor[] | undefined)[] = [undefined, [], ["zstd", "snappy", "zlib", "none"], ["zlib"]];
const DB_NAMES: (string | undefined)[] = [undefined, "", "prosopo", "db name", "a/b", "ünï", "?x#y"];
const AUTH_SOURCES: (string | undefined)[] = [undefined, "", "admin", "a b&c=d"];

const thrown = (error: unknown): Json => ({
	name: error instanceof Error ? error.name : typeof error,
	message: error instanceof Error ? error.message : String(error),
});

const compressors: Json[] = [];
for (const url of URLS) {
	for (const list of COMPRESSOR_LISTS) {
		compressors.push({ url, list: list ?? null, result: getMongoCompressors(url, list) });
	}
}

const connectionOptions: Json[] = [];
for (const url of URLS) {
	for (const extra of [{}, { dbName: "mydb", maxPoolSize: 50, minPoolSize: 5, connectTimeoutMS: 45_000, serverSelectionTimeoutMS: 45_000 }]) {
		try {
			const options = getMongoConnectionOptions({ url, appName: "test-app", ...extra });
			connectionOptions.push({ url, extra, options: JSON.parse(JSON.stringify(options)) as Json });
		} catch (error) {
			connectionOptions.push({ url, extra, error: thrown(error) });
		}
	}
}

const silent = getLogger("error", "equivalence");
const databases: Json[] = [];
for (const url of URLS) {
	for (const dbname of DB_NAMES) {
		for (const authSource of AUTH_SOURCES) {
			const args: Json = { url, dbname: dbname ?? null, authSource: authSource ?? null };
			try {
				const db = new MongoDatabase(url, dbname, authSource, silent);
				databases.push({ args, url: db.url, dbname: db.dbname, tsSafeUrl: db.safeURL });
			} catch (error) {
				databases.push({ args, error: thrown(error) });
			}
		}
	}
}

writeFileSync(
	fileURLToPath(new URL("./vectors.json", import.meta.url)),
	`${JSON.stringify({ compressors, connectionOptions, databases })}\n`,
);
console.log(`wrote vectors.json (${compressors.length} compressor, ${connectionOptions.length} option, ${databases.length} database cases)`);
