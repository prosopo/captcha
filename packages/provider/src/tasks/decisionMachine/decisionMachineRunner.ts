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

import vm from "node:vm";
import type { Logger } from "@prosopo/common";
import {
	type CounterSpec,
	CounterSpecSchema,
	type DecisionMachineArtifact,
	type DecisionMachineCaptchaType,
	DecisionMachineDecision,
	type DecisionMachineInput,
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

/** How long cached artifacts are considered fresh (ms). */
const ARTIFACT_CACHE_TTL_MS =
	Number.parseInt(
		process.env.DECISION_MACHINE_ARTIFACT_CACHE_TTL_MS ?? "",
		10,
	) || 5 * 60 * 1000; // 5 minutes

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

export class DecisionMachineRunner {
	// Shared across instances so admin cache busting in one place propagates to
	// every captcha manager (PoW, image, puzzle) that holds a runner.
	private static readonly artifactCache = new Map<string, CachedArtifact>();

	constructor(private readonly db: IProviderDatabase) {}

	/** Build a cache key for a given scope + dappAccount pair. */
	private static cacheKey(
		scope: DecisionMachineScope,
		dappAccount?: string,
	): string {
		return `${scope}:${dappAccount ?? ""}`;
	}

	/** Return a cached artifact if still fresh, or undefined. */
	private getCachedArtifact(
		scope: DecisionMachineScope,
		dappAccount?: string,
	): DecisionMachineArtifact | undefined | null {
		const entry = DecisionMachineRunner.artifactCache.get(
			DecisionMachineRunner.cacheKey(scope, dappAccount),
		);
		if (!entry) return null; // cache miss
		if (Date.now() - entry.cachedAt > ARTIFACT_CACHE_TTL_MS) {
			DecisionMachineRunner.artifactCache.delete(
				DecisionMachineRunner.cacheKey(scope, dappAccount),
			);
			return null; // expired
		}
		return entry.artifact; // may be undefined (negative cache)
	}

	/** Store an artifact (or undefined for negative cache) in the cache. */
	private setCachedArtifact(
		scope: DecisionMachineScope,
		dappAccount: string | undefined,
		artifact: DecisionMachineArtifact | undefined,
	): void {
		DecisionMachineRunner.artifactCache.set(
			DecisionMachineRunner.cacheKey(scope, dappAccount),
			{
				artifact,
				cachedAt: Date.now(),
			},
		);
	}

	/**
	 * Invalidate the cached entry for a given (scope, dappAccount). Called from
	 * the admin update endpoint so newly-pushed machines propagate immediately.
	 * Static so any runner instance (or the admin endpoint itself) can bust the
	 * shared cache.
	 */
	static invalidateArtifactCache(
		scope: DecisionMachineScope,
		dappAccount?: string,
	): void {
		DecisionMachineRunner.artifactCache.delete(
			DecisionMachineRunner.cacheKey(scope, dappAccount),
		);
	}

	/** Instance shortcut to the static cache invalidator. */
	invalidateArtifactCache(
		scope: DecisionMachineScope,
		dappAccount?: string,
	): void {
		DecisionMachineRunner.invalidateArtifactCache(scope, dappAccount);
	}

	/** Wipe every cached artifact (used by remove-all admin endpoint). */
	static invalidateAllArtifactCache(): void {
		DecisionMachineRunner.artifactCache.clear();
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
	 * serve. Returns undefined when no machine is configured, the machine throws
	 * or times out, or the output fails schema validation — caller should fall
	 * back to its baseline in any of these cases.
	 */
	async route(
		input: RoutingMachineInput,
		logger?: Logger,
	): Promise<RoutingMachineOutput | undefined> {
		try {
			const artifact = await this.selectArtifact(input.dappAccount);
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
				{ input },
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
			const artifact = await this.selectArtifact(input.dappAccount);
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
		captchaType?: DecisionMachineCaptchaType,
	): Promise<DecisionMachineArtifact | undefined> {
		// Try cache first for both scopes
		const cachedDapp = this.getCachedArtifact(
			DecisionMachineScope.Dapp,
			dappAccount,
		);
		const cachedGlobal = this.getCachedArtifact(DecisionMachineScope.Global);

		// Both cached (including negative cache) — use priority logic without DB calls
		if (cachedDapp !== null && cachedGlobal !== null) {
			if (cachedDapp && this.matchesCaptchaType(cachedDapp, captchaType)) {
				return cachedDapp;
			}
			if (cachedGlobal && this.matchesCaptchaType(cachedGlobal, captchaType)) {
				return cachedGlobal;
			}
			return undefined;
		}

		// Fetch both scopes in parallel when cache misses
		const [dappArtifact, globalArtifact] = await Promise.all([
			cachedDapp !== null
				? Promise.resolve(cachedDapp)
				: this.db
						.getDecisionMachineArtifact(DecisionMachineScope.Dapp, dappAccount)
						.then((a) => {
							this.setCachedArtifact(
								DecisionMachineScope.Dapp,
								dappAccount,
								a ?? undefined,
							);
							return a ?? undefined;
						}),
			cachedGlobal !== null
				? Promise.resolve(cachedGlobal)
				: this.db
						.getDecisionMachineArtifact(DecisionMachineScope.Global)
						.then((a) => {
							this.setCachedArtifact(
								DecisionMachineScope.Global,
								undefined,
								a ?? undefined,
							);
							return a ?? undefined;
						}),
		]);

		// Apply priority: dapp-specific first, then global
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
		// If artifact has no captchaType filter, it runs on all captcha types
		if (!artifact.captchaType) {
			return true;
		}
		// If artifact has captchaType filter, it only runs on matching type
		return artifact.captchaType === captchaType;
	}

	/**
	 * Load the artifact source into a fresh vm sandbox, locate a callable
	 * matching one of {exportNames} (or `module.exports` itself if it's a
	 * function), invoke it with {input}, and validate the result with
	 * {schema}. Returns undefined when {options.optional} is true and no
	 * matching export exists. Otherwise throws on missing export, invalid
	 * output, or sandbox failure.
	 */
	private async runArtifactExport<T>(
		artifact: DecisionMachineArtifact,
		exportNames: string[],
		options: { input: unknown; optional?: boolean },
		schema: z.ZodSchema<T>,
	): Promise<T | undefined> {
		const sandbox = {
			module: { exports: {} as unknown },
			exports: {} as Record<string, unknown>,
		};
		const context = vm.createContext(sandbox);
		const script = new vm.Script(artifact.source, {
			filename: "decision-machine.js",
		});
		script.runInContext(context, { timeout: LOAD_TIMEOUT_MS });

		const exported = (sandbox.module as { exports: unknown }).exports;
		const named = this.findExport(exported, exportNames);
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
		// "default" is acceptable.
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
