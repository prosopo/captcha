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
	DecisionMachineInput,
	DecisionMachineOutput,
	DecisionMachineOutputSchema,
	DecisionMachineRuntime,
	DecisionMachineScope,
} from "@prosopo/types";
import type {
	DecisionMachineArtifact,
	IProviderDatabase,
} from "@prosopo/types-database";

const LOAD_TIMEOUT_MS =
	Number.parseInt(process.env.DECISION_MACHINE_LOAD_TIMEOUT_MS ?? "", 10) || 1000;
const EXEC_TIMEOUT_MS =
	Number.parseInt(process.env.DECISION_MACHINE_EXEC_TIMEOUT_MS ?? "", 10) || 2000;

const DEFAULT_DECISION: DecisionMachineOutput = {
	decision: DecisionMachineDecision.Allow,
};

export class DecisionMachineRunner {
	constructor(private readonly db: IProviderDatabase) {}

	async decide(
		input: DecisionMachineInput,
		logger?: Logger,
	): Promise<DecisionMachineOutput> {
		try {
			const artifact = await this.getActiveArtifact(input.dappAccount);
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

	private async getActiveArtifact(
		dappAccount: string,
	): Promise<DecisionMachineArtifact | undefined> {
		const dappArtifact = await this.db.getDecisionMachineArtifact(
			DecisionMachineScope.Dapp,
			dappAccount,
		);
		if (dappArtifact) {
			return dappArtifact;
		}

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
			Promise.resolve((decideFn as (args: DecisionMachineInput) => unknown)(input)),
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
			timeoutId = setTimeout(() => reject(new Error("Decision machine timeout")), timeoutMs);
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
