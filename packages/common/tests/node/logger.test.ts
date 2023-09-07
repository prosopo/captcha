// Copyright 2021-2023 Prosopo (UK) Ltd.
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

import { LogLevel } from 'consola'
import { LogLevelSchema, getLogLevelKeys, getLogLevelValues, getLogger } from '../../src/logger.js'
import { describe, expect, test } from 'vitest'

describe('logging', () => {
    test('has correct log level names', () => {
        expect([...getLogLevelKeys()].sort()).to.deep.equal(
            ['Silent', 'Error', 'Warn', 'Log', 'Info', 'Debug', 'Trace', 'Verbose'].sort()
        )
    })

    test('has correct log level values', () => {
        expect([...getLogLevelValues()].sort()).to.deep.equal(
            [
                LogLevelSchema.Values.Error,
                LogLevelSchema.Values.Warn,
                LogLevelSchema.Values.Log,
                LogLevelSchema.Values.Info,
                LogLevelSchema.Values.Debug,
                LogLevelSchema.Values.Trace,
                LogLevelSchema.Values.Silent,
                LogLevelSchema.Values.Verbose,
            ].sort()
        )
    })

    test('set any valid log level', () => {
        const logger = getLogger('Verbose', 'test')
        for (const level of getLogLevelKeys()) {
            const logLevel = LogLevelSchema.Values[level as keyof typeof LogLevel]
            logger.setLogLevel(level)
            const result = logger.getLogLevel()
            expect(result).to.equal(logLevel)
        }
    })

    test('accepts string log level', () => {
        const logger = getLogger('Verbose', 'test')
        for (const level of getLogLevelKeys()) {
            const logLevel = LogLevelSchema.Values[level as keyof typeof LogLevel]
            logger.setLogLevel(level)
            expect(logger.getLogLevel()).to.equal(logLevel)
        }
    })

    test('accepts number log level', () => {
        const logger = getLogger('Verbose', 'test')
        const values = [...getLogLevelValues()].filter((lvl) => !Number.isNaN(parseInt(lvl.toString())))
        for (const level of values) {
            const levelNum = parseInt(level.toString())
            logger.setLogLevel(levelNum)
            expect(logger.getLogLevel()).to.equal(level)
        }
    })

    // TODO these aren't picked up by vitest
    // test.only('throws error for invalid string log level', () => {
    //     const logger = getLogger('xerbose', 'test')
    //     expect(() => logger.getLogLevel()).to.throw()
    // })
    //
    // test.only('throws error for invalid number log level', () => {
    //     const logger = getLogger(-1, 'test')
    //     expect(() => logger.getLogLevel()).toThrowError(ProsopoBaseError)
    // })

    test('handles varying casing of string log level', function () {
        const logger = getLogger('Verbose', 'test')
        const len = Object.keys(LogLevel).reduce((acc, level, i) => {
            return Math.max(acc, level.length)
        }, 0)
        console.log(len)

        for (let i = 0; i < len; i++) {
            for (const level of getLogLevelKeys()) {
                const logLevel = LogLevelSchema.Values[level as keyof typeof LogLevel]
                for (let j = 0; j < Math.max(i, 3); j++) {
                    let levelCased = level.toLowerCase()
                    levelCased =
                        levelCased.slice(0, j) + levelCased.slice(j, j + 1).toUpperCase() + levelCased.slice(j + 1)
                    logger.setLogLevel(level)
                    expect(logger.getLogLevel()).to.equal(logLevel)
                    logger.setLogLevel(i == 0 ? 'Info' : 'Silent')
                }
            }
        }
    }, 10000)
})
