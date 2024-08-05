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
import { describe, it, expect, vi } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import type { KeyringPair } from '@polkadot/keyring/types'
import { ProsopoApiError, ProsopoEnvError } from '@prosopo/common'
import type { ProviderEnvironment } from '@prosopo/types-env'
import { hexToU8a, isHex } from '@polkadot/util'
import { authMiddleware } from '../../../api/authMiddleware.js'
import type { Tasks } from '../../../tasks/tasks.js'

vi.mock('@polkadot/util', () => ({
    hexToU8a: vi.fn(),
    isHex: vi.fn(),
}))

const mockTasks = {} as Tasks
const mockPair = {
    publicKey: 'mockPublicKey',
    verify: vi.fn(),
} as unknown as KeyringPair
const mockEnv = {
    pair: mockPair,
} as ProviderEnvironment

describe('authMiddleware', () => {
    it('should call next() if signature is valid', async () => {
        const mockReq = {
            headers: {
                signature: '0x1234',
                blocknumber: '1234',
            },
        } as unknown as Request

        const mockRes = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        } as unknown as Response

        const mockNext = vi.fn() as unknown as NextFunction

        vi.mocked(isHex).mockReturnValue(true)
        vi.mocked(hexToU8a).mockReturnValue(new Uint8Array())
        vi.mocked(mockPair.verify).mockReturnValue(true)

        const middleware = authMiddleware(mockTasks, mockEnv)
        await middleware(mockReq, mockRes, mockNext)

        expect(mockNext).toHaveBeenCalled()
        expect(mockRes.status).not.toHaveBeenCalled()
    })

    it('should return 401 if signature is invalid', async () => {
        const mockReq = {
            headers: {
                signature: '0x1234',
                blocknumber: '1234',
            },
        } as unknown as Request

        const mockRes = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        } as unknown as Response

        const mockNext = vi.fn() as unknown as NextFunction

        vi.mocked(isHex).mockReturnValue(true)
        vi.mocked(hexToU8a).mockReturnValue(new Uint8Array())
        vi.mocked(mockPair.verify).mockReturnValue(false)

        const middleware = authMiddleware(mockTasks, mockEnv)
        await middleware(mockReq, mockRes, mockNext)

        expect(mockNext).not.toHaveBeenCalled()
        expect(mockRes.status).toHaveBeenCalledWith(401)
        expect(mockRes.json).toHaveBeenCalledWith({
            error: 'Unauthorized',
            message: expect.any(ProsopoApiError),
        })
    })

    it('should return 401 if key pair is missing', async () => {
        const mockReq = {
            headers: {
                signature: '0x1234',
                blocknumber: '1234',
            },
        } as unknown as Request

        const mockRes = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        } as unknown as Response

        const mockNext = vi.fn() as unknown as NextFunction

        const invalidEnv = {
            pair: null,
        } as unknown as ProviderEnvironment

        const middleware = authMiddleware(mockTasks, invalidEnv)
        await middleware(mockReq, mockRes, mockNext)

        expect(mockNext).not.toHaveBeenCalled()
        expect(mockRes.status).toHaveBeenCalledWith(401)
        expect(mockRes.json).toHaveBeenCalledWith({
            error: 'Unauthorized',
            message: expect.any(ProsopoEnvError),
        })
    })
})
