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
import { describe, expect, test } from 'vitest'
import { flattenObj } from '@prosopo/util'
import { getPaths } from '../projectInfo.js'
import fs from 'fs'

describe('paths', () => {
    test('paths exist', () => {
        const paths = getPaths()
        const flat = flattenObj(paths)
        for (const [key, value] of Object.entries(flat)) {
            expect(value).not.to.be.undefined()
            expect(value).not.to.be.null()
            expect(fs.existsSync(value)).to.be.true()
        }
    })
})
