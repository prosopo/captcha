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
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ProsopoEnvError } from '@prosopo/common'
import { CaptchaMerkleTree, computeCaptchaSolutionHash } from '@prosopo/datasets'
import { CaptchaSolution } from '@prosopo/types'
import { buildTreeAndGetCommitmentId } from '../../../../tasks/imgCaptcha/imgCaptchaTasksUtils.js'

vi.mock('@prosopo/datasets', () => ({
    CaptchaMerkleTree: vi.fn().mockImplementation(() => ({
        build: vi.fn(),
        root: { hash: 'mockedRootHash' },
    })),
    computeCaptchaSolutionHash: vi.fn(),
}))

describe('buildTreeAndGetCommitmentId', () => {
    const mockCaptchaSolutions = [
        { challenge: 'challenge1', solution: 'solution1', salt: 'salt1' },
        { challenge: 'challenge2', solution: 'solution2', salt: 'salt2' },
    ] as unknown as CaptchaSolution[]

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should build a tree and return the commitmentId', () => {
        ;(computeCaptchaSolutionHash as any)
            .mockReturnValueOnce('hashedSolution1')
            .mockReturnValueOnce('hashedSolution2')

        const result = buildTreeAndGetCommitmentId(mockCaptchaSolutions)

        expect(CaptchaMerkleTree).toHaveBeenCalled()
        expect(computeCaptchaSolutionHash).toHaveBeenCalledWith(mockCaptchaSolutions[0])
        expect(computeCaptchaSolutionHash).toHaveBeenCalledWith(mockCaptchaSolutions[1])
        expect(result).toEqual({ tree: expect.any(Object), commitmentId: 'mockedRootHash' })
    })

    it('should throw an error if commitmentId does not exist', () => {
        ;(CaptchaMerkleTree as any).mockImplementation(() => ({
            build: vi.fn(),
            root: { hash: null },
        }))

        expect(() => buildTreeAndGetCommitmentId(mockCaptchaSolutions)).toThrow(
            new ProsopoEnvError('CONTRACT.CAPTCHA_SOLUTION_COMMITMENT_DOES_NOT_EXIST', {
                context: {
                    failedFuncName: 'buildTreeAndGetCommitmentId',
                    commitmentId: null,
                },
            })
        )
    })
})
