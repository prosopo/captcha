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

import type { CaptchaSolution } from "@prosopo/types";
import { moduleBase64 } from "./generated/module.js";

interface CommitmentExports {
	memory: WebAssembly.Memory;
	alloc(len: number): number;
	dealloc(pointer: number, len: number): void;
	commitment_id_json(pointer: number, len: number): number;
	answer_pointer(): number;
	answer_len(): number;
}

const decodeBase64 = (base64: string): Uint8Array => {
	const binary: string = atob(base64);
	const bytes: Uint8Array = new Uint8Array(binary.length);
	for (let index = 0; index < binary.length; index++) {
		bytes[index] = binary.charCodeAt(index);
	}
	return bytes;
};

let instance: Promise<CommitmentExports> | undefined;

// Browsers refuse to compile a module this size synchronously on the main thread.
const load = (): Promise<CommitmentExports> => {
	instance ??= WebAssembly.instantiate(decodeBase64(moduleBase64)).then(
		(source: WebAssembly.WebAssemblyInstantiatedSource) =>
			source.instance.exports as unknown as CommitmentExports,
	);
	return instance;
};

/**
 * The commitment id procaptcha sends with image captcha solutions: the root of the
 * `CaptchaMerkleTree` over each solution's `computeCaptchaSolutionHash`, computed by the same
 * Rust the provider runs.
 */
export const commitmentId = async (
	solutions: CaptchaSolution[],
): Promise<string> => {
	const wasm: CommitmentExports = await load();
	const input: Uint8Array = new TextEncoder().encode(JSON.stringify(solutions));
	const pointer: number = wasm.alloc(input.length);
	new Uint8Array(wasm.memory.buffer, pointer, input.length).set(input);
	const status: number = wasm.commitment_id_json(pointer, input.length);
	wasm.dealloc(pointer, input.length);
	const answer: string = new TextDecoder().decode(
		new Uint8Array(
			wasm.memory.buffer,
			wasm.answer_pointer(),
			wasm.answer_len(),
		),
	);
	if (status !== 0) {
		throw new Error(answer);
	}
	return answer;
};
