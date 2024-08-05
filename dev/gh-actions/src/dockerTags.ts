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

export async function fetchTags(namespace: string, repository: string): Promise<string[]> {
    const tags: string[] = []
    let page = 1
    let nextPageUrl:
        | string
        | null = `https://hub.docker.com/v2/repositories/${namespace}/${repository}/tags/?page=${page}`

    while (nextPageUrl) {
        try {
            const response: any = await axios.get(nextPageUrl)
            const data = response.data
            tags.push(...data.results.map((tag: any) => tag.name))
            nextPageUrl = data.next
            page++
        } catch (error) {
            console.error(`Error fetching tags: ${error}`)
            break
        }
    }

    tags.sort(semVerLt)

    return tags.reverse()
}

export const semVerLt = (a: string, b: string): number => {
    const aParts = a.split('.').map((part) => Number.parseInt(part, 10))
    const bParts = b.split('.').map((part) => Number.parseInt(part, 10))

    if (aParts.length !== bParts.length || aParts.length !== 3) {
        // not semver, so compare lexicographically
        return a.localeCompare(b)
    }

    for (let i = 0; i < aParts.length; i++) {
        const aPart = aParts[i]
        const bPart = bParts[i]
        if(aPart === undefined) {
            throw new Error(`aPart is undefined for ${a}`)
        }
        if(bPart === undefined) {
            throw new Error(`bPart is undefined for ${b}`)
        }
        if (aPart < bPart) {
            return -1
        }if (aPart > bPart) {
            return 1
        }
    }

    return 0
}

export const isSemVer = (tag: string): boolean => {
    return /^\d+\.\d+\.\d+$/.test(tag)
}
