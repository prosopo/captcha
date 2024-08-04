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
import axios from 'axios'
import { fetchTags, isSemVer, semVerLt } from './dockerTags.js'

const main = async () => {
    // get args
    const args = process.argv.slice(2)
    // tags will be sorted in descending order
    const tags = await fetchTags(String(args[0]), String(args[1]))
    // find the tag that is previous to the given tag
    const target = String(args[2])
    for (const tag of tags) {
        if (isSemVer(tag) === false) {
            continue
        }
        if (semVerLt(tag, target) === -1) {
            // found the previous tag
            console.log(tag)
            return
        }
    }
}

main()
