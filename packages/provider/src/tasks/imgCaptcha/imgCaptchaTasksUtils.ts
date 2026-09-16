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
import { createRequire } from "node:module";
import { ProsopoEnvError } from "@prosopo/common";
import { CaptchaMerkleTree } from "@prosopo/datasets";
import type { CaptchaSolution } from "@prosopo/types";

// Load the Rust napi module. In dev the workspace symlink resolves the
// package; in the cli bundle vite copies the .node file next to the bundle
// and node_modules is not shipped, so we fall through to a direct load.
type NativeMerkleModule = {
	computeCaptchaSolutionHash: (
		captchaId: string,
		captchaContentId: string,
		solution: string[],
		salt: string,
	) => string;
	buildMerkleLayers: (leaves: string[]) => string[][];
};
const req = createRequire(import.meta.url);
const nativeMerkle: NativeMerkleModule = (() => {
	try {
		return req("@prosopo/native-merkle") as NativeMerkleModule;
	} catch {
		// Bundle path: cli's vite plugin renames the .node on copy so it
		// doesn't collide with sibling native-* binaries (all named
		// `index.<triple>.node` by napi-rs).
		return req("./prosopo-native-merkle.node") as NativeMerkleModule;
	}
})();

/**
 * Build merkle tree and get commitment id, returning both. The hash-heavy
 * work (per-solution leaf hash + every intermediate layer) runs in Rust via
 * @prosopo/native-merkle; the resulting layers are grafted into a JS
 * CaptchaMerkleTree so callers can still generate proofs.
 */
export const buildTreeAndGetCommitmentId = (
	captchaSolutions: CaptchaSolution[],
): { tree: CaptchaMerkleTree; commitmentId: string } => {
	// Preserve the "no commitment" error contract the old JS impl exposed:
	// native throws Error("leaves is empty") for zero solutions, but callers
	// pattern-match on ProsopoEnvError with the CAPTCHA_SOLUTION_COMMITMENT_
	// DOES_NOT_EXIST translation key.
	if (captchaSolutions.length === 0) {
		throw new ProsopoEnvError(
			"CONTRACT.CAPTCHA_SOLUTION_COMMITMENT_DOES_NOT_EXIST",
			{
				context: {
					failedFuncName: buildTreeAndGetCommitmentId.name,
					commitmentId: null,
				},
			},
		);
	}

	const solutionsHashed = captchaSolutions.map((captcha) =>
		nativeMerkle.computeCaptchaSolutionHash(
			captcha.captchaId,
			captcha.captchaContentId,
			captcha.solution,
			captcha.salt,
		),
	);
	const layers = nativeMerkle.buildMerkleLayers(solutionsHashed);

	const tree = new CaptchaMerkleTree();
	tree.hydrateFromLayers(layers);

	const commitmentId = tree.root?.hash;
	if (!commitmentId) {
		throw new ProsopoEnvError(
			"CONTRACT.CAPTCHA_SOLUTION_COMMITMENT_DOES_NOT_EXIST",
			{
				context: {
					failedFuncName: buildTreeAndGetCommitmentId.name,
					commitmentId: commitmentId,
				},
			},
		);
	}

	return { tree, commitmentId };
};
