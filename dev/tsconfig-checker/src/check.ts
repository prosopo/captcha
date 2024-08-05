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

import * as glob from 'glob'
import { at, get } from '@prosopo/util'
import fs from 'node:fs'
import path from 'node:path'
import z from 'zod'

const readPackageJson = (dir: string): JSON => {
    const pkgJsonStr = fs.readFileSync(`${dir}/package.json`, 'utf8')
    const pkgJson = JSON.parse(pkgJsonStr)
    return pkgJson
}

const main = async () => {
    const packageDir = get(process.env, 'PKG_DIR')
    const workspaceDir = get(process.env, 'WORKSPACE_DIR')
    const fix = process.env.FIX // if fix is set, we'll fix the refs

    process.chdir(packageDir)

    // get the list of packages in the workspace
    const workspacePkgJson = readPackageJson(workspaceDir)
    const workspacePkgGlobPaths = z.string().array().parse(get(workspacePkgJson, 'workspaces'))
    // console.log('workspacePkgGlobPaths', workspacePkgGlobPaths)
    // glob the workspace paths
    // i.e. packages/* => [packages/pkg1, packages/pkg2, ...]
    const workspacePkgPaths = workspacePkgGlobPaths
        .map((p) => glob.sync(`${workspaceDir}/${p}`))
        .reduce((acc, val) => acc.concat(val), [])
        .filter((p) => fs.lstatSync(p).isDirectory())
        .filter((p) => fs.existsSync(`${p}/package.json`))
        .map((p) => path.relative('.', p))
        .map((p) => (p === '' ? '.' : p))
    // console.log('workspacePkgPaths', workspacePkgPaths)
    const workspacePkgNames = workspacePkgPaths.map((p) => z.string().parse(get(readPackageJson(p), 'name')))

    // read the pkg json
    const pkgJson = readPackageJson(packageDir)

    // get the pkg json deps
    const deps = z
        .string()
        .array()
        .parse(Object.keys(get(pkgJson, 'dependencies')))
    // TODO should we include dev deps?
    const devDeps = [] as string[] // z.string().array().parse(Object.keys(get(pkgJson, 'devDependencies')))
    const allDeps = deps.concat(devDeps)
    // filter deps down to those present in the workspace
    const workspaceDeps = allDeps.filter((d) => workspacePkgNames.includes(d))
    const workspaceDepPaths = workspaceDeps.map((d) => at(workspacePkgPaths, workspacePkgNames.indexOf(d)))

    console.log('workspaceDeps', workspaceDeps)
    console.log('workspaceDepPaths', workspaceDepPaths)

    // read the tsconfig json
    const tsconfigJsonStr = fs.readFileSync(`${packageDir}/tsconfig.json`, 'utf8')
    const tsconfigJson = JSON.parse(tsconfigJsonStr)

    // get the tsconfig references
    const refs = ((tsconfigJson.references || []) as { path: string }[]).map((r) => r.path)
    const relRefs = refs.map((r) => path.relative(packageDir, r))
    console.log('tsconfig refs', refs)
    // console.log('relRefs', relRefs)

    const missing = [] as string[]
    const missingPaths = [] as string[]
    const present = [] as string[]
    const presentPaths = [] as string[]
    // go through all the deps, record missing and present
    for (const dep of workspaceDeps) {
        // reverse lookup the path
        const index = workspacePkgNames.indexOf(dep)
        if (index < 0) {
            throw new Error(`Could not find package ${dep} in workspace`)
        }
        const pth = at(workspacePkgPaths, index)
        if (!relRefs.includes(pth)) {
            missing.push(dep)
            missingPaths.push(pth)
        } else {
            present.push(dep)
            presentPaths.push(pth)
        }
    }

    console.log('present', present)
    console.log('missing', missing)

    if (missing.length > 0) {
        if (!fix) throw new Error(`Missing packages: ${missing.join(', ')}`)

        // new refs = old refs + missing dep paths
        const newRefs = refs
            .map((p) => {
                return { path: p }
            })
            .concat(
                missingPaths.map((p) => {
                    return { path: p }
                })
            )
        console.log('new tsconfig refs', newRefs)
        tsconfigJson.references = newRefs
        const newTsconfigJsonStr = JSON.stringify(tsconfigJson, null, 4)
        fs.writeFileSync(`${packageDir}/tsconfig.json`, newTsconfigJsonStr)
    }
}

main()
