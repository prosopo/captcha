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

import { LogLevel, getLogLevelKeys, getLogLevelValues, getLogger } from '../../src/logger'
import { expect } from 'chai'

describe('logging', () => {
    it('has correct log level names', () => {
        expect([...getLogLevelKeys()]).to.deep.equal([
            'Silent',
            'Error',
            'Warn',
            'Log',
            'Info',
            'Debug',
            'Trace',
            'Verbose',
        ])
    })

    it('has correct log level values', () => {
        expect([...getLogLevelValues()]).to.deep.equal([
            LogLevel.Error,
            LogLevel.Warn,
            LogLevel.Log,
            LogLevel.Info,
            LogLevel.Debug,
            LogLevel.Trace,
            LogLevel.Silent,
            LogLevel.Verbose,
        ])
    })

    it('set any valid log level', () => {
        const logger = getLogger('verbose', 'test')
        for (const level of getLogLevelKeys()) {
            const logLevel = LogLevel[level as keyof typeof LogLevel]
            logger.setLogLevel(level)
            const result = logger.getLogLevel()
            expect(result).to.equal(logLevel)
        }
    })

    it('accepts string log level', () => {
        const logger = getLogger('verbose', 'test')
        for (const level of getLogLevelKeys()) {
            const logLevel = LogLevel[level as keyof typeof LogLevel]
            logger.setLogLevel(level)
            expect(logger.getLogLevel()).to.equal(logLevel)
        }
    })

    it('accepts number log level', () => {
        const logger = getLogger('verbose', 'test')
        const values = [...getLogLevelValues()].filter((lvl) => !Number.isNaN(parseInt(lvl.toString())))
        for (const level of values) {
            const levelNum = parseInt(level.toString())
            logger.setLogLevel(levelNum)
            expect(logger.getLogLevel()).to.equal(level)
        }
    })

    it('throws error for invalid string log level', () => {
        const logger = getLogger('verbose', 'test')
        expect(() => logger.setLogLevel('invalid')).to.throw()
    })

    it('throws error for invalid number log level', () => {
        const logger = getLogger('verbose', 'test')
        expect(() => logger.setLogLevel(-1)).to.throw()
    })

    it('handles varying casing of string log level', function () {
        this.timeout(10000)
        const logger = getLogger('verbose', 'test')
        const len = Object.keys(LogLevel).reduce((acc, level, i) => {
            return Math.max(acc, level.length)
        }, 0)

        for (let i = 0; i < len; i++) {
            for (const level of getLogLevelKeys()) {
                const logLevel = LogLevel[level as keyof typeof LogLevel]
                for (let j = 0; j < Math.max(i, 3); j++) {
                    let levelCased = level.toLowerCase()
                    levelCased =
                        levelCased.slice(0, j) + levelCased.slice(j, j + 1).toUpperCase() + levelCased.slice(j + 1)
                    logger.setLogLevel(level)
                    expect(logger.getLogLevel()).to.equal(logLevel)
                    logger.setLogLevel(i == 0 ? 'info' : 'silent')
                }
            }
        }
    })
})
