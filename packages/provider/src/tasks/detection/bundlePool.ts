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

/**
 * Detector bundle pool (provider side).
 *
 * Loads a pool of precomputed, obfuscated detector bundles from disk and caches
 * them in memory — the Node analogue of the Rust "bumblebee" `bundle_manager`.
 * Each bundle is a `{id}.js` (served to the browser) paired with a `{id}.json`
 * (`{ privateKey, innerConfig }`, kept server-side) produced by the catcher
 * `bundle:pool` build script.
 *
 * A bundle is assigned per detector session by {@link DetectorBundlePool.pickRandom},
 * served by id, and resolved again at decryption time so the provider uses the
 * single correct keypair + inner config rather than brute-forcing a key pool.
 * The session→bundle binding lives in Redis (short TTL); this module only holds
 * the immutable pool.
 */

import { randomInt } from "node:crypto";
import {
	existsSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	renameSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { extname, join } from "node:path";

/**
 * Default on-disk location of the pool inside the provider container. Backed by
 * a host volume (see docker-compose.provider.yml) so a pushed pool survives
 * container restarts — nothing is baked into the image, which matters because
 * `prosopo/provider` is a public Docker Hub image and each bundle ships with its
 * own RSA private key.
 */
export const DEFAULT_DETECTOR_POOL_DIR = "/app/data/detector-pool";

/** One precomputed pool bundle: browser JS + its paired server secrets. */
export interface PoolBundle {
	/** The obfuscated browser detector bundle (self-contained ESM). */
	readonly js: string;
	/** Base64-encoded PKCS8 PEM RSA private key (outer transport). */
	readonly privateKey: string;
	/** Base64-encoded InnerCipherConfig (inner symmetric layer). */
	readonly innerConfig: string;
	/**
	 * The release the bundle was built from (e.g. "3.6.64"), stamped by the
	 * catcher `bundle:pool` script. The widget no longer carries a detector — it
	 * runs whatever the provider serves — so the only guard against serving a
	 * detector built from a different release is this field. Optional for pools
	 * built before stamping existed; those load with a warning.
	 */
	readonly release?: string;
}

interface LoadLogger {
	info?: (msg: string, data?: Record<string, unknown>) => void;
	warn?: (msg: string, data?: Record<string, unknown>) => void;
}

/**
 * In-memory pool of detector bundles. Immutable after {@link loadFromDir} except
 * via {@link replace} (used by the admin "emergency push" endpoint to hot-swap
 * the pool without a redeploy).
 */
export class DetectorBundlePool {
	private bundles: Map<string, PoolBundle> = new Map();
	private ids: string[] = [];

	/**
	 * Load every `{id}.js`/`{id}.json` pair from `dir` into memory. A `.js`
	 * without a readable, well-formed `.json` sibling is skipped (logged). Safe
	 * to call on a missing directory (yields an empty pool).
	 */
	loadFromDir(
		dir: string,
		logger: LoadLogger = {},
		expectedRelease?: string,
	): void {
		const next = new Map<string, PoolBundle>();
		if (!existsSync(dir)) {
			logger.warn?.("bundle pool directory does not exist", { dir });
			this.bundles = next;
			this.ids = [];
			return;
		}

		let mismatched = 0;
		let unstamped = 0;
		for (const entry of readdirSync(dir)) {
			if (extname(entry) !== ".js") {
				continue;
			}
			const bundleId = entry.slice(0, -3);
			const jsPath = join(dir, entry);
			const jsonPath = join(dir, `${bundleId}.json`);
			try {
				const js = readFileSync(jsPath, "utf8");
				const secrets = JSON.parse(readFileSync(jsonPath, "utf8")) as {
					privateKey?: unknown;
					innerConfig?: unknown;
					release?: unknown;
				};
				if (
					typeof secrets.privateKey !== "string" ||
					typeof secrets.innerConfig !== "string"
				) {
					logger.warn?.("bundle pool entry has malformed secrets", {
						bundleId,
					});
					continue;
				}
				const release =
					typeof secrets.release === "string" ? secrets.release : undefined;
				// Reject bundles built from a different release. The widget runs
				// whatever we serve and the two only agree by convention, so a
				// mismatched detector fails at runtime with no build-time signal.
				if (expectedRelease && release && release !== expectedRelease) {
					mismatched++;
					continue;
				}
				if (expectedRelease && !release) {
					unstamped++;
				}
				next.set(bundleId, {
					js,
					privateKey: secrets.privateKey,
					innerConfig: secrets.innerConfig,
					...(release && { release }),
				});
			} catch (error) {
				logger.warn?.("failed to load bundle pool entry", {
					bundleId,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}

		if (mismatched > 0) {
			logger.warn?.("skipped bundle pool entries built for another release", {
				skipped: mismatched,
				expectedRelease,
			});
		}
		if (unstamped > 0) {
			logger.warn?.("bundle pool entries have no release stamp", {
				count: unstamped,
				expectedRelease,
			});
		}

		this.replace(next);
		logger.info?.("bundle pool loaded", { count: this.ids.length, dir });
	}

	/** Hot-swap the entire pool (used by the admin replace-pool endpoint). */
	replace(bundles: Map<string, PoolBundle>): void {
		this.bundles = bundles;
		this.ids = [...bundles.keys()].sort();
	}

	/** Number of loaded bundles. */
	size(): number {
		return this.ids.length;
	}

	/**
	 * Pick a uniformly-random bundle. Throws if the pool is empty — the caller
	 * must surface this as a hard failure (no bundle ⇒ no valid payload can be
	 * produced).
	 */
	pickRandom(): { bundleId: string; bundle: PoolBundle } {
		if (this.ids.length === 0) {
			throw new Error("detector bundle pool is empty");
		}
		const bundleId = this.ids[randomInt(this.ids.length)];
		const bundle =
			bundleId !== undefined ? this.bundles.get(bundleId) : undefined;
		if (bundleId === undefined || !bundle) {
			throw new Error("detector bundle pool selection failed");
		}
		return { bundleId, bundle };
	}

	/** Resolve a bundle by id, or `undefined` if it is not (or no longer) in the pool. */
	get(bundleId: string): PoolBundle | undefined {
		return this.bundles.get(bundleId);
	}
}

/** Process-global pool singleton (mirrors bumblebee's OnceCell). */
let globalPool: DetectorBundlePool | null = null;
/** Where {@link initDetectorBundlePool} last loaded from — the persist target. */
let globalPoolDir: string = DEFAULT_DETECTOR_POOL_DIR;

/** Initialise the global pool from `dir`. Idempotent (reloads on each call). */
export function initDetectorBundlePool(
	dir: string,
	logger: LoadLogger = {},
	expectedRelease?: string,
): DetectorBundlePool {
	const pool = new DetectorBundlePool();
	pool.loadFromDir(dir, logger, expectedRelease);
	globalPool = pool;
	globalPoolDir = dir;
	return pool;
}

/**
 * Write a pool to `dir` in the same `{id}.js` / `{id}.json` layout
 * {@link DetectorBundlePool.loadFromDir} reads, so a pushed pool is picked up
 * again on the next boot instead of vanishing with the process.
 *
 * Staged into a sibling directory and renamed into place so a crash mid-write
 * can't leave a half-written pool that would load as a partial set. Throws on
 * failure — the caller decides whether an unpersisted push is acceptable.
 */
export function persistDetectorBundlePool(
	bundles: Map<string, PoolBundle>,
	dir: string = globalPoolDir,
): void {
	const staging = `${dir}.staging`;
	rmSync(staging, { recursive: true, force: true });
	mkdirSync(staging, { recursive: true });

	for (const [bundleId, bundle] of bundles) {
		writeFileSync(join(staging, `${bundleId}.js`), bundle.js, "utf8");
		writeFileSync(
			join(staging, `${bundleId}.json`),
			JSON.stringify({
				privateKey: bundle.privateKey,
				innerConfig: bundle.innerConfig,
				...(bundle.release && { release: bundle.release }),
			}),
			// Secrets: owner read/write only. The volume is host-mounted, so this
			// is the only thing standing between the pool and any other process
			// sharing the mount.
			{ encoding: "utf8", mode: 0o600 },
		);
	}

	rmSync(dir, { recursive: true, force: true });
	renameSync(staging, dir);
}

/** Get the global pool, or `null` if {@link initDetectorBundlePool} was never called. */
export function getDetectorBundlePool(): DetectorBundlePool | null {
	return globalPool;
}

/**
 * Hot-swap the global pool's contents (admin "emergency push" channel) and
 * write it to the pool directory so it survives a restart. Creates the global
 * pool if it does not exist yet.
 *
 * The in-memory swap happens first and is never rolled back: a running provider
 * serving the new pool is the point of the push, and it is strictly better than
 * a provider serving the old one. A failed persist is reported so the caller can
 * warn — the pool is live but will be lost on the next restart.
 */
export function replaceDetectorBundlePool(
	bundles: Map<string, PoolBundle>,
	logger: LoadLogger = {},
): { count: number; persisted: boolean } {
	if (!globalPool) {
		globalPool = new DetectorBundlePool();
	}
	globalPool.replace(bundles);

	let persisted = false;
	try {
		persistDetectorBundlePool(bundles);
		persisted = true;
	} catch (error) {
		logger.warn?.("failed to persist detector bundle pool to disk", {
			dir: globalPoolDir,
			error: error instanceof Error ? error.message : String(error),
		});
	}

	return { count: globalPool.size(), persisted };
}
