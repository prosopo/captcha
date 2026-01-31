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
	DecisionMachineDecision,
	type DecisionMachineInput,
	type DecisionMachineOutput,
	DecisionMachineOutputSchema,
	DecisionMachineRuntime,
	DecisionMachineScope,
} from "@prosopo/types";
import type {
	DecisionMachineArtifact,
	IProviderDatabase,
} from "@prosopo/types-database";

const LOAD_TIMEOUT_MS =
	Number.parseInt(process.env.DECISION_MACHINE_LOAD_TIMEOUT_MS ?? "", 10) ||
	1000;
const EXEC_TIMEOUT_MS =
	Number.parseInt(process.env.DECISION_MACHINE_EXEC_TIMEOUT_MS ?? "", 10) ||
	2000;

const DEFAULT_DECISION: DecisionMachineOutput = {
	decision: DecisionMachineDecision.Allow,
};

export class DecisionMachineRunner {
	constructor(private readonly db: IProviderDatabase) {}

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
			const artifact = await this.selectArtifact(input.dappAccount);
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

			const output = await this.executeNodeMachine(artifact, input);
			return output;
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
	 * Selects a single decision machine artifact based on scope priority.
	 * Currently supports two scopes with the following priority:
	 *   1. Dapp-specific: Custom decision machine for a specific dapp account
	 *   2. Global: Default decision machine applied to all dapps
	 *
	 * @param dappAccount - The dapp account identifier to check for dapp-specific artifacts
	 * @returns The single highest-priority artifact, or undefined if none exists
	 */
	private async selectArtifact(
		dappAccount: string,
	): Promise<DecisionMachineArtifact | undefined> {
		// Check for dapp-specific artifact first (highest priority)
		const dappArtifact = await this.db.getDecisionMachineArtifact(
			DecisionMachineScope.Dapp,
			dappAccount,
		);
		if (dappArtifact) {
			return dappArtifact;
		}

		// Fall back to global artifact (lower priority)
		return this.db.getDecisionMachineArtifact(DecisionMachineScope.Global);
	}

	private async executeNodeMachine(
		artifact: DecisionMachineArtifact,
		input: DecisionMachineInput,
	): Promise<DecisionMachineOutput> {
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
		const decideFn =
			typeof exported === "function"
				? exported
				: typeof (exported as { decide?: unknown })?.decide === "function"
					? (exported as { decide: unknown }).decide
					: undefined;

		if (!decideFn) {
			throw new Error("Decision machine must export a decide function.");
		}

		const decision = await this.withTimeout(
			Promise.resolve(
				(decideFn as (args: DecisionMachineInput) => unknown)(input),
			),
			EXEC_TIMEOUT_MS,
		);
		const parsed = DecisionMachineOutputSchema.safeParse(decision);
		if (!parsed.success) {
			throw new Error("Decision machine output failed validation.");
		}

		return parsed.data;
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
