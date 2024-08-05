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

import { LogLevel, getLogger } from '../../logger.js'
import { describe, expect, test } from 'vitest'

describe('logging', () => {
    test('set any valid log level', () => {
        const logger = getLogger('info', 'test')
        for (const level of LogLevel.options) {
            logger.setLogLevel(level)
            const result = logger.getLogLevel()
            expect(result).to.equal(level)
        }
    })

    test('accepts string log level', () => {
        const logger = getLogger('info', 'test')
        for (const logLevel of LogLevel.options) {
            const level = logLevel.toString()
            logger.setLogLevel(level)
            expect(logger.getLogLevel()).to.equal(logLevel)
        }
    })

    test('throws error for invalid string log level', () => {
        expect(() => getLogger('xerbose', 'test')).to.throw()
    })

    test('handles varying casing of string log level', () => {
        const logger = getLogger('info', 'test')
        const len = Object.keys(LogLevel).reduce((acc, level, i) => {
            return Math.max(acc, level.length)
        }, 0)
        console.log(len)

        for (let i = 0; i < len; i++) {
            for (const level of LogLevel.options) {
                for (let j = 0; j < Math.max(i, 3); j++) {
                    let levelCased = level.toLowerCase()
                    levelCased =
                        levelCased.slice(0, j) + levelCased.slice(j, j + 1).toUpperCase() + levelCased.slice(j + 1)
                    logger.setLogLevel(level)
                    expect(logger.getLogLevel()).to.equal(level)
                    logger.setLogLevel(i == 0 ? 'info' : 'debug')
                }
            }
        }
    })
})
