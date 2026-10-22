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

import { generateKeyPairSync } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import {
	OPEN_DETECTOR_FORMAT,
	type ReplaceDetectorPoolBodyType,
} from "@prosopo/types";
import { PUBLIC_KEY_PLACEHOLDER } from "./publicKey.js";

type PoolBundles = ReplaceDetectorPoolBodyType["bundles"];

/**
 * One bundle per keypair, each a copy of the built detector with its own
 * public key inlined. The provider assigns visitors across bundles, so a key
 * lifted from one bundle's JS reads only that bundle's share of traffic.
 */
export const buildPool = (detectorJs: string, count: number): PoolBundles => {
	if (detectorJs.split(PUBLIC_KEY_PLACEHOLDER).length !== 2) {
		throw new Error(
			"the detector bundle must contain the public key placeholder exactly once",
		);
	}
	const bundles: PoolBundles = {};
	for (let index = 0; index < count; index++) {
		const { publicKey, privateKey } = generateKeyPairSync("rsa", {
			modulusLength: 2048,
			publicKeyEncoding: { type: "spki", format: "der" },
			privateKeyEncoding: { type: "pkcs8", format: "pem" },
		});
		bundles[`bundle-${index}`] = {
			js: detectorJs.replace(
				PUBLIC_KEY_PLACEHOLDER,
				publicKey.toString("base64"),
			),
			privateKey: Buffer.from(privateKey).toString("base64"),
			format: OPEN_DETECTOR_FORMAT,
		};
	}
	return bundles;
};

const main = (): void => {
	const { values } = parseArgs({
		options: {
			out: { type: "string", default: "detector-pool.json" },
			count: { type: "string", default: "4" },
			force: { type: "boolean", default: false },
		},
	});
	const count = Number.parseInt(values.count, 10);
	if (!Number.isInteger(count) || count < 1) {
		throw new Error("--count must be a positive integer");
	}
	const detectorPath = fileURLToPath(
		new URL("../dist/bundle/detector.js", import.meta.url),
	);
	if (!existsSync(detectorPath)) {
		throw new Error(
			"no built detector: run `pnpm --filter @prosopo/detector-botd run build` first",
		);
	}
	const out = resolve(process.env.INIT_CWD ?? process.cwd(), values.out);
	if (existsSync(out) && !values.force) {
		throw new Error(`${out} exists; pass --force to overwrite it`);
	}
	const body: ReplaceDetectorPoolBodyType = {
		bundles: buildPool(readFileSync(detectorPath, "utf8"), count),
	};
	// Private keys: owner read/write only.
	writeFileSync(out, JSON.stringify(body), { mode: 0o600 });
	console.log(`Wrote ${count} detector bundles to ${out}`);
};

if (
	process.argv[1] &&
	resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
	main();
}
