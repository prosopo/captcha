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

import { Worker } from "node:worker_threads";
import { getLogger } from "@prosopo/logger";

// Machines are uploaded code and run synchronously. A timer on
// the main thread can never interrupt them, so a slow machine used to hold up
// every request in the process and its time limit never fired. In a worker the
// limit is real: the main thread stays free and terminates the worker.
const logger = getLogger("info", "provider:decision-machine-pool");

const DEFAULT_WORKERS = 2;
const DEFAULT_MAX_QUEUE = 1000;
// A runaway allocation must kill the worker, not the provider.
const WORKER_HEAP_LIMIT_MB = 256;

const numberFromEnv = (name: string, fallback: number): number => {
	const parsed = Number.parseInt(process.env[name] ?? "", 10);
	return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
};

/** `PROSOPO_DECISION_MACHINE_WORKERS=0` is the kill switch: run inline. */
export const decisionMachineWorkersEnabled = (): boolean =>
	numberFromEnv("PROSOPO_DECISION_MACHINE_WORKERS", DEFAULT_WORKERS) > 0;

// Keeps a compiled sandbox per source so a call only pays for the run. Errors
// are flattened to strings because they do not survive structured clone.
const WORKER_SOURCE = `
import { createHash } from "node:crypto";
import vm from "node:vm";
import { parentPort, workerData } from "node:worker_threads";

const machines = new Map();

const load = (source) => {
	const key = createHash("sha256").update(source).digest("hex");
	const cached = machines.get(key);
	if (cached) return cached;
	const sandbox = { module: { exports: {} }, exports: {} };
	const script = new vm.Script(source, { filename: "decision-machine.js" });
	script.runInContext(vm.createContext(sandbox), {
		timeout: workerData.loadTimeoutMs,
	});
	const exported = sandbox.module.exports;
	const exportsObj =
		typeof exported === "function"
			? { default: exported }
			: exported && typeof exported === "object"
				? exported
				: {};
	const entry = { exported, exportsObj };
	machines.set(key, entry);
	return entry;
};

const find = ({ exported, exportsObj }, names) => {
	if (
		typeof exported === "function" &&
		(names.includes("default") || names.includes("decide"))
	) {
		return { name: "default", fn: exported };
	}
	for (const name of names) {
		if (typeof exportsObj[name] === "function") {
			return { name, fn: exportsObj[name] };
		}
	}
	return undefined;
};

parentPort.on("message", async (msg) => {
	if (msg.clear) {
		machines.clear();
		return;
	}
	const { id, source, exportNames, input } = msg;
	try {
		const named = find(load(source), exportNames);
		if (!named) {
			parentPort.postMessage({ id, ok: true, found: false });
			return;
		}
		const started = performance.now();
		const result = await named.fn(input);
		parentPort.postMessage({
			id,
			ok: true,
			found: true,
			name: named.name,
			result,
			runMs: performance.now() - started,
		});
	} catch (err) {
		parentPort.postMessage({
			id,
			ok: false,
			message: err instanceof Error ? err.message : String(err),
		});
	}
});
`;

export interface DecisionMachineRun {
	source: string;
	exportNames: string[];
	input: unknown;
	timeoutMs: number;
	loadTimeoutMs: number;
}

export type DecisionMachineRunResult =
	| { found: false }
	| { found: true; name: string; result: unknown; runMs: number };

interface WorkerReply {
	id: number;
	ok: boolean;
	found?: boolean;
	name?: string;
	result?: unknown;
	runMs?: number;
	message?: string;
}

interface Job {
	id: number;
	run: DecisionMachineRun;
	resolve: (value: DecisionMachineRunResult) => void;
	reject: (reason: Error) => void;
	timer: NodeJS.Timeout;
	worker?: Worker;
}

let nextJobId = 0;
let loadTimeoutMs = 1000;
let workers: Worker[] = [];
let idle: Worker[] = [];
const queue: Job[] = [];
const running = new Map<Worker, Job>();

const finish = (job: Job): void => {
	clearTimeout(job.timer);
	if (job.worker) running.delete(job.worker);
};

const dispatch = (): void => {
	for (;;) {
		const worker = idle.pop();
		if (!worker) return;
		const job = queue.shift();
		if (!job) {
			idle.push(worker);
			return;
		}
		job.worker = worker;
		running.set(worker, job);
		const { source, exportNames, input } = job.run;
		try {
			worker.postMessage({ id: job.id, source, exportNames, input });
		} catch (err) {
			// Input that cannot be cloned is the caller's failure, not the worker's.
			finish(job);
			idle.push(worker);
			job.reject(err instanceof Error ? err : new Error(String(err)));
		}
	}
};

const onReply = (worker: Worker, reply: WorkerReply): void => {
	const job = running.get(worker);
	if (!job || job.id !== reply.id) return;
	finish(job);
	idle.push(worker);
	if (!reply.ok) {
		job.reject(new Error(reply.message ?? "Decision machine failed"));
	} else if (!reply.found) {
		job.resolve({ found: false });
	} else {
		job.resolve({
			found: true,
			name: reply.name ?? "default",
			result: reply.result,
			runMs: reply.runMs ?? 0,
		});
	}
	dispatch();
};

const replaceWorker = (worker: Worker): void => {
	if (!workers.includes(worker)) return;
	workers = workers.filter((candidate) => candidate !== worker);
	idle = idle.filter((candidate) => candidate !== worker);
	workers.push(spawn());
	dispatch();
};

const spawn = (): Worker => {
	const worker = new Worker(WORKER_SOURCE, {
		eval: true,
		workerData: { loadTimeoutMs },
		resourceLimits: { maxOldGenerationSizeMb: WORKER_HEAP_LIMIT_MB },
	});
	worker.unref();
	idle.push(worker);
	worker.on("message", (reply: WorkerReply) => onReply(worker, reply));
	const lost = (reason: Error): void => {
		const job = running.get(worker);
		if (job) {
			finish(job);
			job.reject(reason);
		}
		replaceWorker(worker);
	};
	worker.once("error", (err) => {
		logger.error(() => ({ err, msg: "Decision machine worker failed" }));
		lost(err);
	});
	worker.once("exit", () => lost(new Error("Decision machine worker exited")));
	return worker;
};

const ensurePool = (): void => {
	if (workers.length > 0) return;
	const size = numberFromEnv("PROSOPO_DECISION_MACHINE_WORKERS", DEFAULT_WORKERS);
	for (let i = 0; i < size; i++) workers.push(spawn());
};

/**
 * Run a machine export off the event loop. `timeoutMs` covers queueing and
 * running, so a backlog can't delay a request past the limit; a job still
 * running at the limit has its worker terminated and replaced.
 */
export const runDecisionMachine = (
	run: DecisionMachineRun,
): Promise<DecisionMachineRunResult> => {
	loadTimeoutMs = run.loadTimeoutMs;
	ensurePool();
	const maxQueue = numberFromEnv(
		"PROSOPO_DECISION_MACHINE_MAX_QUEUE",
		DEFAULT_MAX_QUEUE,
	);
	if (queue.length >= maxQueue) {
		return Promise.reject(new Error("Decision machine queue full"));
	}
	return new Promise<DecisionMachineRunResult>((resolve, reject) => {
		const job: Job = {
			id: nextJobId++,
			run,
			resolve,
			reject,
			timer: setTimeout(() => {
				const queued = queue.indexOf(job);
				if (queued >= 0) queue.splice(queued, 1);
				const worker = job.worker;
				finish(job);
				reject(new Error("Decision machine timeout"));
				if (worker) {
					replaceWorker(worker);
					void worker.terminate();
				}
			}, run.timeoutMs),
		};
		job.timer.unref?.();
		queue.push(job);
		dispatch();
	});
};

/** Drop compiled sandboxes, so a deleted machine's memory is released. */
export const clearDecisionMachineWorkers = (): void => {
	for (const worker of workers) worker.postMessage({ clear: true });
};

/** Test seam, and a clean shutdown path. */
export const shutdownDecisionMachinePool = async (): Promise<void> => {
	const current = workers;
	workers = [];
	idle = [];
	await Promise.all(current.map((worker) => worker.terminate()));
};
