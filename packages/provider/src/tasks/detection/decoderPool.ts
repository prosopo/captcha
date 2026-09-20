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

import { availableParallelism } from "node:os";
import { Worker } from "node:worker_threads";
import { getLogger } from "@prosopo/logger";
import { recordDecoderOutcome } from "../../api/metrics.js";
import {
	type DecoderName,
	decoderModuleUrl,
	decoderModuleUrls,
} from "./decoderModules.js";

// The decoders are pure: payload in, plain object out, no shared state and no
// dependency on the main thread — verified by running the same input through
// both and getting the same answer, including the same failures.
//
// They are also the largest block of synchronous work the provider does. On a
// production node they held the event loop for 15-47 ms per call and made up
// ~84% of all measured blocking, which delays every other request in flight,
// health checks included. Moving them to worker threads costs a round trip of
// 0.01-0.2 ms and gives that time back.
const logger = getLogger("info", "provider:decoder-pool");

const DEFAULT_TIMEOUT_MS = 5000;

const numberFromEnv = (name: string, fallback: number): number => {
	const raw = process.env[name];
	if (raw === undefined || raw === "") return fallback;
	const parsed = Number.parseInt(raw, 10);
	return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

/**
 * Workers to run. Defaults to a small share of the box, since decoding is one
 * of several things the node does and the rest of it still needs cores.
 *
 * `PROSOPO_DECODER_WORKERS=0` runs every decode inline on the main thread —
 * the behaviour before this existed. That is the kill switch: it needs a
 * restart but not a rollback.
 */
const poolSize = (): number =>
	numberFromEnv(
		"PROSOPO_DECODER_WORKERS",
		Math.max(1, Math.min(4, availableParallelism() - 1)),
	);

const timeoutMs = (): number =>
	numberFromEnv("PROSOPO_DECODER_TIMEOUT_MS", DEFAULT_TIMEOUT_MS);

// Runs in the worker. Loads all three decoders once at startup so the first
// request does not pay for it, then answers one call at a time.
//
// Errors are flattened to message strings: an Error does not survive
// structured clone with its prototype, and the callers only ever read the
// message.
const WORKER_SOURCE = `
import { parentPort, workerData } from "node:worker_threads";

const decoders = {};
for (const [name, url] of Object.entries(workerData.urls)) {
	decoders[name] = (await import(url)).default;
}
parentPort.postMessage({ ready: true });

parentPort.on("message", async ({ id, decoder, args }) => {
	try {
		const result = await decoders[decoder](...args);
		parentPort.postMessage({ id, ok: true, result });
	} catch (err) {
		parentPort.postMessage({
			id,
			ok: false,
			message: err instanceof Error ? err.message : String(err),
		});
	}
});
`;

interface PendingCall {
	resolve: (value: unknown) => void;
	reject: (reason: Error) => void;
	timer: NodeJS.Timeout;
}

interface PooledWorker {
	worker: Worker;
	ready: Promise<void>;
	/** Calls issued to this worker and not yet answered. */
	inFlight: Map<number, PendingCall>;
}

let pool: PooledWorker[] | undefined;
let nextCallId = 0;
let nextWorker = 0;
let inlineFallback = false;

const spawn = (): PooledWorker => {
	const worker = new Worker(WORKER_SOURCE, {
		eval: true,
		workerData: { urls: decoderModuleUrls() },
	});
	const pooled: PooledWorker = {
		worker,
		inFlight: new Map(),
		ready: new Promise<void>((resolve, reject) => {
			worker.once("message", () => resolve());
			worker.once("error", reject);
		}),
	};

	worker.on(
		"message",
		(msg: {
			id?: number;
			ok?: boolean;
			result?: unknown;
			message?: string;
		}) => {
			if (msg.id === undefined) return;
			const pending = pooled.inFlight.get(msg.id);
			if (!pending) return;
			pooled.inFlight.delete(msg.id);
			clearTimeout(pending.timer);
			if (msg.ok) {
				pending.resolve(msg.result);
			} else {
				pending.reject(new Error(msg.message ?? "decoder failed"));
			}
		},
	);

	// A worker that dies takes its outstanding calls with it. Fail them
	// explicitly rather than leaving the requests hanging until their own
	// timeouts, and put a replacement in its slot.
	const abandon = (reason: string): void => {
		for (const [id, pending] of pooled.inFlight) {
			clearTimeout(pending.timer);
			pending.reject(new Error(reason));
			pooled.inFlight.delete(id);
		}
		replace(pooled);
	};
	worker.on("error", (err) => {
		logger.error(() => ({ msg: "Decoder worker errored", err }));
		abandon(`decoder worker errored: ${err.message}`);
	});
	worker.on("exit", (code) => {
		if (code === 0) return;
		logger.error(() => ({ msg: "Decoder worker exited", data: { code } }));
		abandon(`decoder worker exited with code ${code}`);
	});

	worker.unref();
	return pooled;
};

const replace = (dead: PooledWorker): void => {
	if (!pool) return;
	const index = pool.indexOf(dead);
	if (index === -1) return;
	try {
		pool[index] = spawn();
	} catch (err) {
		// Losing a worker slot is survivable — the others keep serving, and an
		// empty pool falls back to inline decoding. Losing the process is not.
		logger.error(() => ({ msg: "Could not replace decoder worker", err }));
		pool.splice(index, 1);
	}
};

const getPool = (): PooledWorker[] | undefined => {
	if (inlineFallback) return undefined;
	if (pool) return pool.length > 0 ? pool : undefined;

	const size = poolSize();
	if (size === 0) {
		inlineFallback = true;
		logger.info(() => ({
			msg: "Decoder workers disabled, decoding inline",
		}));
		return undefined;
	}

	try {
		pool = Array.from({ length: size }, () => spawn());
		logger.info(() => ({ msg: "Decoder pool started", data: { size } }));
		return pool;
	} catch (err) {
		// Serving slowly beats not serving. If workers cannot be created at
		// all, decode on the main thread exactly as before.
		inlineFallback = true;
		logger.error(() => ({
			msg: "Could not start decoder pool, falling back to inline decoding",
			err,
		}));
		return undefined;
	}
};

const runInline = async (
	decoder: DecoderName,
	args: unknown[],
): Promise<unknown> => {
	const mod = (await import(decoderModuleUrl(decoder))) as {
		default: (...args: unknown[]) => Promise<unknown>;
	};
	return mod.default(...args);
};

const runOnWorker = async (
	pooled: PooledWorker,
	decoder: DecoderName,
	args: unknown[],
): Promise<unknown> => {
	await pooled.ready;
	const id = nextCallId++;
	return new Promise<unknown>((resolve, reject) => {
		const timer = setTimeout(() => {
			pooled.inFlight.delete(id);
			// The worker is still stuck in whatever did not return, so it
			// cannot be handed the next call. Terminating replaces it.
			void pooled.worker.terminate();
			reject(new Error(`decoder '${decoder}' timed out`));
		}, timeoutMs());
		// Node keeps the process alive for a pending timer; a decode in flight
		// is not a reason to stay up.
		timer.unref?.();
		pooled.inFlight.set(id, { resolve, reject, timer });
		pooled.worker.postMessage({ id, decoder, args });
	});
};

/**
 * Decode off the event loop, falling back to inline decoding if the pool is
 * unavailable. Either way the contract is the one the callers already handle:
 * resolves with the decoder's result, rejects with its error.
 */
export const decode = async <T>(
	decoder: DecoderName,
	args: unknown[],
): Promise<T> => {
	const started = process.hrtime.bigint();
	const workers = getPool();
	// Round-robin rather than least-loaded: decodes are close enough in cost
	// that tracking depth would buy less than it costs to maintain.
	const pooled = workers?.[nextWorker++ % workers.length];
	try {
		const result = pooled
			? await runOnWorker(pooled, decoder, args)
			: await runInline(decoder, args);
		recordDecoderOutcome(decoder, "ok", elapsedSeconds(started));
		return result as T;
	} catch (err) {
		recordDecoderOutcome(decoder, "error", elapsedSeconds(started));
		throw err;
	}
};

const elapsedSeconds = (started: bigint): number =>
	Number(process.hrtime.bigint() - started) / 1e9;

/** Test seam, and a clean shutdown path for the CLI. */
export const shutdownDecoderPool = async (): Promise<void> => {
	const workers = pool;
	pool = undefined;
	inlineFallback = false;
	nextWorker = 0;
	if (!workers) return;
	await Promise.all(workers.map((pooled) => pooled.worker.terminate()));
};
