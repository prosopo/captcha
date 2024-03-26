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

import { get } from '@prosopo/util'
import fs from 'fs'
import z from 'zod'
import * as glob from 'glob';

const readPackageJson = (dir: string): JSON => {
    const pkgJsonStr = fs.readFileSync(`${dir}/package.json`, 'utf8')
    const pkgJson = JSON.parse(pkgJsonStr)
    return pkgJson
}

const main = async () => {
    const packageDir = get(process.env, 'PKG_DIR')
    const workspaceDir = get(process.env, 'WORKSPACE_DIR')
    const fix = process.env.FIX // if fix is set, we'll fix the refs

    // get the list of packages in the workspace
    const workspacePkgJson = readPackageJson(workspaceDir)
    const workspacePkgGlobPaths = z.string().array().parse(get(workspacePkgJson, 'workspaces'))
    console.log('workspacePkgGlobPaths', workspacePkgGlobPaths)
    // glob the workspace paths
    // i.e. packages/* => [packages/pkg1, packages/pkg2, ...]
    const workspacePkgPaths = workspacePkgGlobPaths.map(p => glob.sync(`${workspaceDir}/${p}`)).reduce((acc, val) => acc.concat(val), []).filter(p => fs.lstatSync(p).isDirectory()).filter(p => fs.existsSync(`${p}/package.json`))
    console.log('workspacePkgPaths', workspacePkgPaths)
    const workspacePkgNames = workspacePkgPaths.map(p => z.string().parse(get(readPackageJson(p), 'name')))

    // read the pkg json
    const pkgJson = readPackageJson(packageDir)
    
    // get the pkg json deps
    const deps = z.string().array().parse(get(pkgJson, 'dependencies'))
    const devDeps = z.string().array().parse(get(pkgJson, 'devDependencies'))
    const allDeps = deps.concat(devDeps)
    // filter deps down to those present in the workspace
    const workspaceDeps = allDeps.filter(d => workspacePkgNames.includes(d))
    
    console.log('workspaceDeps', workspaceDeps)

    // read the tsconfig json
    const tsconfigJsonStr = fs.readFileSync(`${packageDir}/tsconfig.json`, 'utf8')
    const tsconfigJson = JSON.parse(tsconfigJsonStr)

    // get the tsconfig references
    const refs = ((tsconfigJson.references || []) as { path: string }[]).map(r => r.path)
    console.log('refs', refs)

    const missing = [] as string[]
    // go through the refs, remove any deps already linked
    for (const ref of refs) {
        const refPkgJson = readPackageJson(`${packageDir}/${ref}`)
        const pkgName = z.string().parse(get(pkgJson, 'name'))
        if(!(workspaceDeps.includes(pkgName))) {
            missing.push(pkgName)
        }
    }

    if (missing.length > 0) {
        if (!fix) throw new Error(`Missing packages: ${missing.join(', ')}`)
        
        // fix the refs. Go through the missing packages, build the ref, add it to the references, then write the tsconfig
        // get the relative path from the package to the workspace
        const relPath = workspaceDir.replace(packageDir, '.')
        const missingRefs = missing.map(m => ({ path: `${relPath}/${m}` }))
        const newRefs = refs.map(p => {
            return { path: p }
        }).concat(missingRefs)
        console.log('newRefs', newRefs)
        tsconfigJson.references = newRefs
        const newTsconfigJsonStr = JSON.stringify(tsconfigJson, null, 4)
        fs.writeFileSync(`${packageDir}/tsconfig.json`, newTsconfigJsonStr)
    }

}

main()
