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

import { exec } from "node:child_process"
import { z } from "zod"
import readline from 'node:readline';

const exe = async (cmd: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        exec(cmd, (err, stdout, stderr) => {
            if (err) {
                console.error(stderr)
                reject(err)
            } else {
                resolve(stdout)
            }
        })
    })
}

const main = async () => {
    // stdin is a list of changed files
    const changedFiles: string[]= []

    const rl = readline.createInterface({
        input: process.stdin,
    })

    // listen for lines of input
    rl.on("line", (line) => {
        changedFiles.push(line);
    })

    // wait for the input to end
    await new Promise((resolve) => {
        rl.on("close", resolve)
    })

    // console.log("changedFiles:", changedFiles)

    // list all the packages in the workspace
    const pkgs = (await exe(
        `npm run --workspaces env | grep npm_package_name | cut -d '=' -f 2`,
    )).split("\n").filter((f) => f !== "");
    // console.log("packages:", pkgs);

    const pkgInfoSpec = z.object({
        dependencies: z.record(
            z.object({
                resolved: z.string().optional(),
                dependencies: z.record(z.object({})).optional(),
            }),
        ),
    });
    type PkgInfo = z.infer<typeof pkgInfoSpec>;

    // get all the pkgs used in the workspace
    const workspaceInfo = ([await exe("npm list --json")]
                                        .map((info) => JSON.parse(info))
                                        .map((info) =>
                                            pkgInfoSpec.parse({ ...info, name: "workspace" }),
                                        )[0] as PkgInfo
                                ).dependencies

    // for each package, find its info from the workspace info
    const pkgInfos = pkgs.map((pkg) => {
        const info = workspaceInfo[pkg]
        if (info === undefined) {
            throw new Error(`Package ${pkg} not found in workspace dependencies`)
        }
        // path to the package prefixed with "file://"
        // strip the prefix
        // for some reason, all the paths have "../../" in front of them, so remove them
        return { name: pkg, deps: info.dependencies ? Object.keys(info.dependencies) : [], path: info.resolved ? info.resolved.slice("file://".length).replaceAll('/../', '').replaceAll("../", "") : ''}
    })

    // find out which packages have changed by going through each changed file and finding what package it belongs to, if any
    const changedPkgs = changedFiles.map(file => {
        for (const pkgInfo of pkgInfos) {
            const pth = pkgInfo.path;
            // if the change file is in this package
            if (file.startsWith(pth)) {
                // console.log(`File ${file} belongs to package ${pkgInfo.name}`)
                // add the package to the list of changed packages
                return pkgInfo
            }
        }
        // console.log(`File ${file} not in any npm workspace package`);
        return null
    }).filter((pkgInfo) => pkgInfo !== null);
    // console.log("changedPkgs:", changedPkgs.map(info => info.name))

    // we now have a list of packages which have changed
    // now we need to find any packages which depend on these packages
    // start off with the list of changed packages
    const changePkgsWithDeps: typeof changedPkgs = []
    const queue = [...changedPkgs] // process the queue of pkgs
    while (queue.length > 0) {
        const pkg = queue.pop()
        if (pkg === undefined) {
            throw new Error("pop() returned undefined")
        }
        
        if(changePkgsWithDeps.includes(pkg)) {
            // already processed
            // console.log('Already processed', pkg.name)
            continue
        }
        
        // add the package to the set of changed packages
        changePkgsWithDeps.push(pkg)

        // find all the packages which depend on this package
        for(const pkgInfo of pkgInfos) {
            if(pkgInfo.deps.includes(pkg.name)) {
                queue.push(pkgInfo)
            }
        }
    }

    // now we have a set of pkgs which have changed and all the pkgs which depend on them
    // console.log("changedPkgsWithDeps:", changePkgsWithDeps.map(info => info.name))
    for(const pkg of changePkgsWithDeps) {
        console.log(pkg.name)
    }
}

main()
