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

import type { Logger } from "@prosopo/common";
import type { Database } from "@prosopo/database";
import type { CaptchaMerkleTree } from "@prosopo/datasets";
import type { ProviderEnvironment } from "@prosopo/types-env";
import type { RedisClientType } from "@redis/client";
import { vi } from "vitest";

/**
 * Creates a comprehensive mock for the ProviderEnvironment
 * This allows testing of complex middleware and API functions without requiring
 * full infrastructure setup (databases, Redis, external services)
 */
export function createMockProviderEnvironment(): ProviderEnvironment {
    // Mock logger
    const mockLogger: Logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        with: vi.fn().mockReturnThis(),
        child: vi.fn().mockReturnThis(),
    };

    // Mock database storages
    const mockUserAccessRulesStorage = {
        get: vi.fn(),
        getAll: vi.fn(),
        store: vi.fn(),
        remove: vi.fn(),
        count: vi.fn(),
        getByUser: vi.fn(),
        incrementAccessCount: vi.fn(),
        checkRateLimit: vi.fn(),
        storeRateLimitData: vi.fn(),
    };

    const mockCaptchaStorage = {
        get: vi.fn(),
        getAll: vi.fn(),
        store: vi.fn(),
        remove: vi.fn(),
        count: vi.fn(),
        getRandom: vi.fn(),
        getById: vi.fn(),
        getByIds: vi.fn(),
        storeBatch: vi.fn(),
        getExpired: vi.fn(),
        removeExpired: vi.fn(),
        getByDatasetId: vi.fn(),
        getByDatasetIdAndIds: vi.fn(),
        getPending: vi.fn(),
        getSolved: vi.fn(),
        storeOrUpdate: vi.fn(),
        getUnsolved: vi.fn(),
        getCaptchaSolution: vi.fn(),
    };

    const mockDatasetStorage = {
        get: vi.fn(),
        getAll: vi.fn(),
        store: vi.fn(),
        remove: vi.fn(),
        count: vi.fn(),
        getByDatasetId: vi.fn(),
        getByDatasetIdAndIds: vi.fn(),
        storeBatch: vi.fn(),
        getRandom: vi.fn(),
        getByFormat: vi.fn(),
        getByContentType: vi.fn(),
    };

    const mockProviderStorage = {
        get: vi.fn(),
        getAll: vi.fn(),
        store: vi.fn(),
        remove: vi.fn(),
        count: vi.fn(),
        getBySiteKey: vi.fn(),
        getByOwner: vi.fn(),
        getByServiceOrigin: vi.fn(),
    };

    const mockUserStorage = {
        get: vi.fn(),
        getAll: vi.fn(),
        store: vi.fn(),
        remove: vi.fn(),
        count: vi.fn(),
        getByAccount: vi.fn(),
        getById: vi.fn(),
    };

    // Mock database
    const mockDatabase: Database = {
        connect: vi.fn(),
        disconnect: vi.fn(),
        isConnected: vi.fn().mockReturnValue(true),
        getCaptchaStorage: vi.fn().mockReturnValue(mockCaptchaStorage),
        getDatasetStorage: vi.fn().mockReturnValue(mockDatasetStorage),
        getProviderStorage: vi.fn().mockReturnValue(mockProviderStorage),
        getUserStorage: vi.fn().mockReturnValue(mockUserStorage),
        getUserAccessRulesStorage: vi.fn().mockReturnValue(mockUserAccessRulesStorage),
        getCollection: vi.fn(),
        getCollections: vi.fn(),
        getStats: vi.fn(),
    };

    // Mock Redis client
    const mockRedisClient: RedisClientType = {
        connect: vi.fn(),
        disconnect: vi.fn(),
        isOpen: true,
        isReady: true,
        ping: vi.fn(),
        get: vi.fn(),
        set: vi.fn(),
        del: vi.fn(),
        expire: vi.fn(),
        ttl: vi.fn(),
        exists: vi.fn(),
        incr: vi.fn(),
        hGet: vi.fn(),
        hSet: vi.fn(),
        hDel: vi.fn(),
        hGetAll: vi.fn(),
        lPush: vi.fn(),
        lPop: vi.fn(),
        lRange: vi.fn(),
        sAdd: vi.fn(),
        sRem: vi.fn(),
        sMembers: vi.fn(),
        sIsMember: vi.fn(),
        publish: vi.fn(),
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
        pSubscribe: vi.fn(),
        pUnsubscribe: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
        once: vi.fn(),
        emit: vi.fn(),
    } as unknown as RedisClientType;

    // Mock configuration
    const mockConfig = {
        logLevel: "info",
        server: {
            port: 9229,
            host: "localhost",
        },
        database: {
            development: {
                type: "mongodb" as const,
                endpoint: "mongodb://localhost:27017",
                dbname: "prosopo_test",
                authSource: "admin",
            },
        },
        redisConnection: {
            url: "redis://localhost:6379",
            password: "test",
            indexName: "test",
        },
        captcha: {
            solved: {
                count: 2,
            },
            unsolved: {
                count: 1,
            },
        },
        assets: {
            path: "/tmp/test-assets",
        },
        prosopo: {
            contract: {
                address: "test-contract-address",
                account: {
                    address: "test-account-address",
                    secret: "test-secret",
                },
            },
            database: {
                development: {
                    type: "mongodb" as const,
                    endpoint: "mongodb://localhost:27017",
                    dbname: "prosopo_test",
                    authSource: "admin",
                },
            },
        },
        tasks: {
            queues: {
                imageCaptcha: "image-captcha-queue",
                powCaptcha: "pow-captcha-queue",
            },
        },
    };

    // Mock tasks
    const mockTasks = {
        getImageCaptcha: vi.fn(),
        submitImageCaptchaSolution: vi.fn(),
        getPoWCaptcha: vi.fn(),
        submitPoWCaptchaSolution: vi.fn(),
        getFrictionlessCaptcha: vi.fn(),
        getDataset: vi.fn(),
        getRandomCaptcha: vi.fn(),
        getCaptchaChallenge: vi.fn(),
        validateCaptchaSolution: vi.fn(),
        getProviderDetails: vi.fn(),
        getBotScore: vi.fn(),
    };

    // Mock keyring pair
    const mockPair = {
        address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
        publicKey: new Uint8Array(32),
        sign: vi.fn(),
        verify: vi.fn(),
    };

    // Mock keyring
    const mockKeyring = {
        addFromUri: vi.fn().mockReturnValue(mockPair),
        addFromSeed: vi.fn().mockReturnValue(mockPair),
        getPairs: vi.fn().mockReturnValue([mockPair]),
        getPair: vi.fn().mockReturnValue(mockPair),
    };

    // Create the mock environment
    const mockEnv: ProviderEnvironment = {
        config: mockConfig,
        logger: mockLogger,
        db: mockDatabase,
        redis: mockRedisClient,
        tasks: mockTasks,
        pair: mockPair,
        keyring: mockKeyring,
        defaultEnvironment: "development" as const,
        assetsResolver: undefined,
        authAccount: mockPair,
        getDb: vi.fn().mockReturnValue(mockDatabase),
        getRedis: vi.fn().mockReturnValue(mockRedisClient),
        getLogger: vi.fn().mockReturnValue(mockLogger),
        getConfig: vi.fn().mockReturnValue(mockConfig),
        getTasks: vi.fn().mockReturnValue(mockTasks),
        isReady: vi.fn().mockResolvedValue(undefined),
        importDatabase: vi.fn().mockResolvedValue(undefined),
        getCaptchaMerkleTree: vi.fn().mockImplementation(() => {
            return {
                build: vi.fn(),
                root: { hash: "mock-root-hash" },
                getRoot: vi.fn().mockReturnValue({ hash: "mock-root-hash" }),
            } as unknown as CaptchaMerkleTree;
        }),
    };

    return mockEnv;
}

/**
 * Creates mock Express request/response objects for middleware testing
 */
export function createMockExpressObjects() {
    const mockReq = {
        headers: {},
        body: {},
        query: {},
        params: {},
        ip: "127.0.0.1",
        originalUrl: "/",
        method: "GET",
        url: "/",
        path: "/",
    };

    const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        send: vi.fn().mockReturnThis(),
        setHeader: vi.fn().mockReturnThis(),
        getHeader: vi.fn(),
        end: vi.fn(),
        locals: {},
    };

    const mockNext = vi.fn();

    return { mockReq, mockRes, mockNext };
}