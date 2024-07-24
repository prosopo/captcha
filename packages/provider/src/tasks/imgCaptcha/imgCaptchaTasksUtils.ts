import { ProsopoEnvError } from '@prosopo/common'
import { buildDataset, CaptchaMerkleTree, computeCaptchaSolutionHash } from '@prosopo/datasets'
import { CaptchaSolution, DatasetRaw } from '@prosopo/types'

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
