// Copyright 2021-2024 Prosopo (UK) Ltd.
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
import { ProsopoEnvError } from '@prosopo/common'
import { CaptchaMerkleTree, computeCaptchaSolutionHash } from '@prosopo/datasets'
import { CaptchaSolution } from '@prosopo/types'

/**
 * Build merkle tree and get commitment from contract, returning the tree, commitment, and commitmentId
 * @param {CaptchaSolution[]} captchaSolutions
 * @returns {Promise<{ tree: CaptchaMerkleTree, commitment: CaptchaSolutionCommitment, commitmentId: string }>}
 */
export const buildTreeAndGetCommitmentId = (
    captchaSolutions: CaptchaSolution[]
): { tree: CaptchaMerkleTree; commitmentId: string } => {
    const tree = new CaptchaMerkleTree()
    const solutionsHashed = captchaSolutions.map((captcha) => computeCaptchaSolutionHash(captcha))
    tree.build(solutionsHashed)

    const commitmentId = tree.root?.hash
    if (!commitmentId) {
        throw new ProsopoEnvError('CONTRACT.CAPTCHA_SOLUTION_COMMITMENT_DOES_NOT_EXIST', {
            context: {
                failedFuncName: buildTreeAndGetCommitmentId.name,
                commitmentId: commitmentId,
            },
        })
    }

    return { tree, commitmentId }
}
