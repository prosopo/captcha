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
import { CaptchasContainer, CaptchasContainerSchema, DataSchema } from '@prosopo/types'
import { at } from '@prosopo/util'
import fs from 'fs'

// recursively list files in a directory
export function* fsWalk(
    pth: string,
    options?: {
        filesFirst?: boolean // if true, depth first (i.e. yield files inside a dir before the dir itself, recursively), else yield in encounter order (i.e. dir first, then files inside, recursively)
    }
): Generator<string> {
    // if path is a directory, recurse
    const isDir = fs.existsSync(pth) && fs.statSync(pth).isDirectory()
    let subpaths = isDir ? fs.readdirSync(pth) : []
    subpaths = subpaths.map((f) => `${pth}/${f}`)
    if (!options?.filesFirst) {
        yield pth
    }
    for (const subpath of subpaths) {
        yield* fsWalk(subpath, options)
    }
    if (options?.filesFirst) {
        yield pth
    }
}

// test whether two files/dirs are equal, recursively comparing contents as required
export const fsEq = (pth1: string, pth2: string) => {
    const it1 = fsWalk(pth1)
    const it2 = fsWalk(pth2)
    // drop the root path
    const files1 = [...it1].map((f) => f.slice(pth1.length))
    const files2 = [...it2].map((f) => f.slice(pth2.length))
    if (files1.length !== files2.length) {
        return false
    }
    // sort files so in same order
    files1.sort()
    files2.sort()
    if (!files1.every((f, i) => f === files2[i])) {
        // the two lists of files are not the same
        return false
    }
    // compare contents of each file
    for (let i = 0; i < files1.length; i++) {
        const file1 = pth1 + at(files1, i)
        const file2 = pth2 + at(files2, i)
        const stat1 = fs.statSync(file1)
        if (stat1.isDirectory()) {
            // already checked above
            continue
        }
        // files, so compare contents
        const content1 = fs.readFileSync(file1)
        const content2 = fs.readFileSync(file2)
        if (!content1.equals(content2)) {
            return false
        }
    }
    return true
}

export const readDataJson = (pth: string) => {
    let content = fs.readFileSync(pth).toString()
    // TODO use getPaths() here to find the repo dir
    content = content.replaceAll('${repo}', __dirname + '/../../../..')
    const dataJson = JSON.parse(content.toString())
    const data = DataSchema.parse(dataJson)
    return data
}

export const readCaptchasJson = (pth: string) => {
    const content = fs.readFileSync(pth).toString()
    const dataJson = JSON.parse(content)
    const captchas = CaptchasContainerSchema.parse(dataJson)
    return captchas
}

export const captchasEqFs = (pth1: string, pth2: string) => {
    const data1 = readCaptchasJson(pth1)
    const data2 = readCaptchasJson(pth2)
    return captchasEq(data1, data2)
}

export const captchasEq = (first: CaptchasContainer, second: CaptchasContainer) => {
    if (first.captchas.length !== second.captchas.length) {
        return false
    }
    for (let i = 0; i < first.captchas.length; i++) {
        const captcha1 = at(first.captchas, i)
        const captcha2 = at(second.captchas, i)
        // salts should not be the same as generated on the fly and not stored!
        if (captcha1.salt === captcha2.salt) {
            return false
        }
        // everything else should be the same
        const { salt: salt1, ...rest1 } = captcha1
        const { salt: salt2, ...rest2 } = captcha2
        if (JSON.stringify(rest1) !== JSON.stringify(rest2)) {
            return false
        }
    }
    return true
}

export const substituteRepoDir = () => {
    // read all json files in the test data dir
    for (const pth of fsWalk(__dirname + '/data')) {
        if (!pth.endsWith('.json')) {
            continue
        }
        // make a backup of each file
        fs.copyFileSync(pth, pth + '.bak')
        // replace ${repo} with the path to the repo
        let content = fs.readFileSync(pth).toString()
        // TODO use getPaths() here to find the repo dir
        content = content.replaceAll('${repo}', __dirname + '/../../../..')
        // rewrite the file
        fs.writeFileSync(pth, content)
    }
}

export const restoreRepoDir = () => {
    // read all json files in the test data dir
    for (const pth of fsWalk(__dirname + '/data')) {
        if (!pth.endsWith('.json')) {
            continue
        }
        // restore the backup of each file
        fs.renameSync(pth + '.bak', pth)
    }
}
