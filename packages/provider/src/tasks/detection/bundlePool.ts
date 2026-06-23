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
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { extname, join } from "node:path";

/** One precomputed pool bundle: browser JS + its paired server secrets. */
export interface PoolBundle {
	/** The obfuscated browser detector bundle (self-contained ESM). */
	readonly js: string;
	/** Base64-encoded PKCS8 PEM RSA private key (outer transport). */
	readonly privateKey: string;
	/** Base64-encoded InnerCipherConfig (inner symmetric layer). */
	readonly innerConfig: string;
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
	loadFromDir(dir: string, logger: LoadLogger = {}): void {
		const next = new Map<string, PoolBundle>();
		if (!existsSync(dir)) {
			logger.warn?.("bundle pool directory does not exist", { dir });
			this.bundles = next;
			this.ids = [];
			return;
		}

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
				next.set(bundleId, {
					js,
					privateKey: secrets.privateKey,
					innerConfig: secrets.innerConfig,
				});
			} catch (error) {
				logger.warn?.("failed to load bundle pool entry", {
					bundleId,
					error: error instanceof Error ? error.message : String(error),
				});
			}
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

/** Initialise the global pool from `dir`. Idempotent (reloads on each call). */
export function initDetectorBundlePool(
	dir: string,
	logger: LoadLogger = {},
): DetectorBundlePool {
	const pool = new DetectorBundlePool();
	pool.loadFromDir(dir, logger);
	globalPool = pool;
	return pool;
}

/** Get the global pool, or `null` if {@link initDetectorBundlePool} was never called. */
export function getDetectorBundlePool(): DetectorBundlePool | null {
	return globalPool;
}

/**
 * Hot-swap the global pool's contents (admin "emergency push" channel). Creates
 * the global pool if it does not exist yet. Returns the new bundle count.
 */
export function replaceDetectorBundlePool(
	bundles: Map<string, PoolBundle>,
): number {
	if (!globalPool) {
		globalPool = new DetectorBundlePool();
	}
	globalPool.replace(bundles);
	return globalPool.size();
}
