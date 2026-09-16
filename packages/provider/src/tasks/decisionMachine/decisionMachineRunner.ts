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

import { createHash } from "node:crypto";
import vm from "node:vm";
import type { Logger } from "@prosopo/logger";
import {
	type CounterSpec,
	CounterSpecSchema,
	type DecisionMachineArtifact,
	type DecisionMachineCaptchaType,
	DecisionMachineDecision,
	type DecisionMachineInput,
	DecisionMachineKind,
	type DecisionMachineOutput,
	DecisionMachineOutputSchema,
	DecisionMachineRuntime,
	DecisionMachineScope,
	type RoutingMachineInput,
	type RoutingMachineInputBase,
	type RoutingMachineOutput,
	RoutingMachineOutputSchema,
} from "@prosopo/types";
import type { IProviderDatabase } from "@prosopo/types-database";
import { z } from "zod";

const LOAD_TIMEOUT_MS =
	Number.parseInt(process.env.DECISION_MACHINE_LOAD_TIMEOUT_MS ?? "", 10) ||
	1000;
const EXEC_TIMEOUT_MS =
	Number.parseInt(process.env.DECISION_MACHINE_EXEC_TIMEOUT_MS ?? "", 10) ||
	2000;

interface CachedMachine {
	exports: Record<string, unknown>;
}

/**
 * Module-level cache of loaded machine sandboxes, keyed by SHA-256 of
 * `artifact.source`, so repeat invocations skip both `new vm.Script(...)`
 * and the top-level `script.runInContext(...)`.
 *
 * Shared across every `DecisionMachineRunner` in the process, since each task
 * class constructs its own runner. The exported functions are treated as
 * stateless: they run against the caller's `input` and don't mutate
 * module-local state.
 *
 * Content-addressed, so a new source gets a new key and the old entry sits
 * until restart; {@link invalidateDecisionMachineScriptCache} clears it.
 */
const machineCache = new Map<string, CachedMachine>();

const hashSource = (source: string): string =>
	createHash("sha256").update(source).digest("hex");

/**
 * Compile + execute the artifact source in a fresh vm sandbox on first use,
 * then reuse the resulting `module.exports` for every subsequent invocation
 * of the same source. See {@link machineCache}.
 */
const loadMachine = (source: string): CachedMachine => {
	const key = hashSource(source);
	const cached = machineCache.get(key);
	if (cached) return cached;

	const sandbox = {
		module: { exports: {} as unknown },
		exports: {} as Record<string, unknown>,
	};
	const context = vm.createContext(sandbox);
	const script = new vm.Script(source, {
		filename: "decision-machine.js",
	});
	script.runInContext(context, { timeout: LOAD_TIMEOUT_MS });

	const exported = (sandbox.module as { exports: unknown }).exports;
	const exportsObj: Record<string, unknown> =
		typeof exported === "function"
			? { default: exported }
			: exported && typeof exported === "object"
				? (exported as Record<string, unknown>)
				: {};

	const entry: CachedMachine = { exports: exportsObj };
	machineCache.set(key, entry);
	return entry;
};

/**
 * Clear the module-level script cache. Call together with
 * {@link invalidateAllDecisionMachineArtifactCaches} after any
 * `upsertDecisionMachineArtifact` so the new artifact takes effect on the next
 * request instead of waiting for the artifact TTL.
 */
export const invalidateDecisionMachineScriptCache = (): void => {
	machineCache.clear();
};

/** How long cached artifacts are considered fresh (ms). */
const ARTIFACT_CACHE_TTL_MS =
	Number.parseInt(
		process.env.DECISION_MACHINE_ARTIFACT_CACHE_TTL_MS ?? "",
		10,
	) || 5 * 60 * 1000;

const DEFAULT_DECISION: DecisionMachineOutput = {
	decision: DecisionMachineDecision.Allow,
};

const RequiredCountersSchema = z.array(CounterSpecSchema);

interface CachedArtifact {
	artifact: DecisionMachineArtifact | undefined;
	cachedAt: number;
}

interface NamedExport {
	name: string;
	fn: (...args: unknown[]) => unknown;
}

/**
 * Every live runner, so {@link invalidateAllDecisionMachineArtifactCaches} can
 * flush all their artifact caches in one call. Held as `WeakRef` so a runner
 * that goes out of scope can still be garbage collected.
 */
const liveRunners = new Set<WeakRef<DecisionMachineRunner>>();

/** Flush every runner's artifact cache. See {@link invalidateDecisionMachineScriptCache}. */
export const invalidateAllDecisionMachineArtifactCaches = (): void => {
	for (const ref of liveRunners) {
		const runner = ref.deref();
		if (runner === undefined) {
			liveRunners.delete(ref);
			continue;
		}
		runner.invalidateArtifactCache();
	}
};

export class DecisionMachineRunner {
	private readonly artifactCache = new Map<string, CachedArtifact>();

	constructor(private readonly db: IProviderDatabase) {
		liveRunners.add(new WeakRef(this));
	}

	public invalidateArtifactCache(): void {
		this.artifactCache.clear();
	}

	private static cacheKey(
		scope: DecisionMachineScope,
		kind: DecisionMachineKind,
		dappAccount?: string,
	): string {
		return `${scope}:${kind}:${dappAccount ?? ""}`;
	}

	/**
	 * Returns `null` on a miss or expired entry, and `undefined` for a cached
	 * negative result (no artifact exists).
	 */
	private getCachedArtifact(
		scope: DecisionMachineScope,
		kind: DecisionMachineKind,
		dappAccount?: string,
	): DecisionMachineArtifact | undefined | null {
		const key = DecisionMachineRunner.cacheKey(scope, kind, dappAccount);
		const entry = this.artifactCache.get(key);
		if (!entry) return null;
		if (Date.now() - entry.cachedAt > ARTIFACT_CACHE_TTL_MS) {
			this.artifactCache.delete(key);
			return null;
		}
		return entry.artifact;
	}

	/** Pass `undefined` as the artifact to cache a negative result. */
	private setCachedArtifact(
		scope: DecisionMachineScope,
		kind: DecisionMachineKind,
		dappAccount: string | undefined,
		artifact: DecisionMachineArtifact | undefined,
	): void {
		this.artifactCache.set(
			DecisionMachineRunner.cacheKey(scope, kind, dappAccount),
			{
				artifact,
				cachedAt: Date.now(),
			},
		);
	}

	/**
	 * Evaluates a single decision machine artifact and returns a decision.
	 * Only one decision machine is selected and executed per request based on scope priority.
	 *
	 * @param input - The decision machine input containing user, dapp, and behavioral data
	 * @param logger - Optional logger for warnings and errors
	 * @returns A decision (allow/deny) with optional metadata
	 */
	async decide(
		input: DecisionMachineInput,
		logger?: Logger,
	): Promise<DecisionMachineOutput> {
		try {
			const artifact = await this.selectArtifact(
				input.dappAccount,
				DecisionMachineKind.Decision,
				input.captchaType,
			);
			if (!artifact) {
				return DEFAULT_DECISION;
			}

			if (artifact.runtime !== DecisionMachineRuntime.Node) {
				logger?.warn?.(() => ({
					msg: "Unsupported decision machine runtime, defaulting to allow",
					data: { runtime: artifact.runtime },
				}));
				return DEFAULT_DECISION;
			}

			const decision = await this.runArtifactExport(
				artifact,
				["decide", "default"],
				{ input: { ...input, phase: input.phase ?? "verify" } },
				DecisionMachineOutputSchema,
			);
			return decision ?? DEFAULT_DECISION;
		} catch (error) {
			logger?.error?.(() => ({
				msg: "Decision machine failed, defaulting to allow",
				err: error,
				data: { dappAccount: input.dappAccount },
			}));
			return DEFAULT_DECISION;
		}
	}

	/**
	 * Routing phase: ask the configured machine which concrete captcha type to
	 * serve. Returns undefined when no machine is configured, the machine has
	 * no route export, the machine throws or times out, or the output fails
	 * schema validation — caller should fall back to its baseline in any of
	 * these cases.
	 */
	async route(
		input: RoutingMachineInput,
		logger?: Logger,
	): Promise<RoutingMachineOutput | undefined> {
		try {
			const artifact = await this.selectArtifact(
				input.dappAccount,
				DecisionMachineKind.Routing,
			);
			if (!artifact) return undefined;
			if (artifact.runtime !== DecisionMachineRuntime.Node) {
				logger?.warn?.(() => ({
					msg: "Unsupported routing machine runtime, falling back to baseline",
					data: { runtime: artifact.runtime },
				}));
				return undefined;
			}
			return await this.runArtifactExport(
				artifact,
				["route"],
				{ input, optional: true },
				RoutingMachineOutputSchema,
			);
		} catch (error) {
			logger?.error?.(() => ({
				msg: "Routing machine failed, falling back to baseline",
				err: error,
				data: { dappAccount: input.dappAccount },
			}));
			return undefined;
		}
	}

	/**
	 * Pre-fetch hook: ask the configured machine which counters it needs read
	 * into its input before {@link route} is invoked. Returns [] when no machine
	 * is configured or it doesn't declare any.
	 */
	async getRequiredCounters(
		input: RoutingMachineInputBase,
		logger?: Logger,
	): Promise<CounterSpec[]> {
		try {
			const artifact = await this.selectArtifact(
				input.dappAccount,
				DecisionMachineKind.Routing,
			);
			if (!artifact) return [];
			if (artifact.runtime !== DecisionMachineRuntime.Node) return [];
			const specs = await this.runArtifactExport(
				artifact,
				["requiredCounters"],
				{ input, optional: true },
				RequiredCountersSchema,
			);
			return specs ?? [];
		} catch (error) {
			logger?.warn?.(() => ({
				msg: "requiredCounters() failed, proceeding with no counters",
				err: error,
				data: { dappAccount: input.dappAccount },
			}));
			return [];
		}
	}

	/**
	 * Selects a single decision machine artifact based on scope priority.
	 * Currently supports two scopes with the following priority:
	 *   1. Dapp-specific: Custom decision machine for a specific dapp account
	 *   2. Global: Default decision machine applied to all dapps
	 *
	 * Decision machines can optionally specify a captchaType filter:
	 *   - If artifact has no captchaType: runs on all captcha types
	 *   - If artifact has captchaType: only runs on matching captcha type
	 *
	 * @param dappAccount - The dapp account identifier to check for dapp-specific artifacts
	 * @param captchaType - The captcha type to filter by (optional)
	 * @returns The single highest-priority artifact, or undefined if none exists
	 */
	private async selectArtifact(
		dappAccount: string,
		kind: DecisionMachineKind,
		captchaType?: DecisionMachineCaptchaType,
	): Promise<DecisionMachineArtifact | undefined> {
		const cachedDapp = this.getCachedArtifact(
			DecisionMachineScope.Dapp,
			kind,
			dappAccount,
		);
		const cachedGlobal = this.getCachedArtifact(
			DecisionMachineScope.Global,
			kind,
		);

		if (cachedDapp !== null && cachedGlobal !== null) {
			return this.pickByPriority(cachedDapp, cachedGlobal, captchaType);
		}

		const [dappArtifact, globalArtifact] = await Promise.all([
			cachedDapp !== null
				? Promise.resolve(cachedDapp)
				: this.fetchAndCacheArtifact(
						DecisionMachineScope.Dapp,
						kind,
						dappAccount,
					),
			cachedGlobal !== null
				? Promise.resolve(cachedGlobal)
				: this.fetchAndCacheArtifact(
						DecisionMachineScope.Global,
						kind,
						undefined,
					),
		]);

		return this.pickByPriority(dappArtifact, globalArtifact, captchaType);
	}

	private fetchAndCacheArtifact(
		scope: DecisionMachineScope,
		kind: DecisionMachineKind,
		dappAccount: string | undefined,
	): Promise<DecisionMachineArtifact | undefined> {
		return this.db
			.getDecisionMachineArtifact(scope, dappAccount, kind)
			.then((a) => {
				this.setCachedArtifact(scope, kind, dappAccount, a ?? undefined);
				return a ?? undefined;
			});
	}

	private pickByPriority(
		dappArtifact: DecisionMachineArtifact | undefined,
		globalArtifact: DecisionMachineArtifact | undefined,
		captchaType: DecisionMachineCaptchaType | undefined,
	): DecisionMachineArtifact | undefined {
		if (dappArtifact && this.matchesCaptchaType(dappArtifact, captchaType)) {
			return dappArtifact;
		}
		if (
			globalArtifact &&
			this.matchesCaptchaType(globalArtifact, captchaType)
		) {
			return globalArtifact;
		}
		return undefined;
	}

	/**
	 * Checks if a decision machine artifact matches the requested captcha type.
	 * - If artifact has no captchaType filter: matches all captcha types
	 * - If artifact has captchaType filter: only matches if types are equal
	 *
	 * @param artifact - The decision machine artifact to check
	 * @param captchaType - The captcha type to match against (optional)
	 * @returns True if the artifact should run for this captcha type
	 */
	private matchesCaptchaType(
		artifact: DecisionMachineArtifact,
		captchaType?: string,
	): boolean {
		if (!artifact.captchaType) {
			return true;
		}
		return artifact.captchaType === captchaType;
	}

	/**
	 * Look up the (cached) module exports for `artifact.source`, locate a
	 * callable matching one of {exportNames} (or the cached `default` slot
	 * if `module.exports` was itself a function), invoke it with {input},
	 * and validate the result with {schema}. Returns undefined when
	 * {options.optional} is true and no matching export exists. Otherwise
	 * throws on missing export, invalid output, or sandbox failure.
	 *
	 * The vm.Script compilation + top-level `runInContext` runs at most
	 * once per source blob (see {@link loadMachine} / {@link machineCache}).
	 */
	private async runArtifactExport<T>(
		artifact: DecisionMachineArtifact,
		exportNames: string[],
		options: { input: unknown; optional?: boolean },
		// `z.ZodType<T, _, unknown>` rather than `z.ZodSchema<T>`: the latter
		// pins Input === Output === T, so a schema with `.default()`s
		// anywhere in its tree (RoutingMachineOutputSchema's puzzle settings)
		// makes T unify with the *input* shape and the parsed result stops
		// matching the declared output type. This says only "a schema that
		// produces T from unknown input", which is what the caller wants.
		schema: z.ZodType<T, z.ZodTypeDef, unknown>,
	): Promise<T | undefined> {
		const { exports } = loadMachine(artifact.source);
		const named = this.findExport(exports, exportNames);
		if (!named) {
			if (options.optional) return undefined;
			throw new Error(
				`Decision machine must export one of: ${exportNames.join(", ")}`,
			);
		}

		const result = await this.withTimeout(
			Promise.resolve(named.fn(options.input)),
			EXEC_TIMEOUT_MS,
		);
		const parsed = schema.safeParse(result);
		if (!parsed.success) {
			throw new Error(
				`Decision machine '${named.name}' output failed validation`,
			);
		}
		return parsed.data;
	}

	private findExport(
		exported: unknown,
		exportNames: string[],
	): NamedExport | undefined {
		// Treat the entire module.exports as the default function only when
		// "default" (or "decide") is acceptable.
		if (
			typeof exported === "function" &&
			(exportNames.includes("default") || exportNames.includes("decide"))
		) {
			return {
				name: "default",
				fn: exported as (...args: unknown[]) => unknown,
			};
		}
		for (const name of exportNames) {
			const candidate = (exported as Record<string, unknown> | null)?.[name];
			if (typeof candidate === "function") {
				return { name, fn: candidate as (...args: unknown[]) => unknown };
			}
		}
		return undefined;
	}

	private async withTimeout<T>(
		promise: Promise<T>,
		timeoutMs: number,
	): Promise<T> {
		let timeoutId: NodeJS.Timeout | undefined;
		const timeoutPromise = new Promise<never>((_, reject) => {
			timeoutId = setTimeout(
				() => reject(new Error("Decision machine timeout")),
				timeoutMs,
			);
		});

		try {
			return await Promise.race([promise, timeoutPromise]);
		} finally {
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
		}
	}
}
