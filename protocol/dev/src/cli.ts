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
import { hexToU8a } from '@polkadot/util'
import { readdirSync } from 'fs'
import { spawn } from 'child_process'
import { stdin } from 'process'
import fs from 'fs'
import path from 'path'
import process from 'process'
import yargs from 'yargs'

const contractSrcFileExtension = '.rs'

// string to string map of env variables
interface Env {
    [key: string]: string
}

// add in the git commit to env
const getGitCommitId = async () => {
    // get the git commit id
    const gitCommitIdResult = await exec('git rev-parse HEAD')
    const gitCommitId = gitCommitIdResult.stdout.trim()
    // console.log("git commit id:", gitCommitId)
    const gitCommitIdBytes = hexToU8a(gitCommitId)
    // console.log("git commit id bytes:", gitCommitIdBytes)
    const gitCommitIdBytesString: string = '[' + gitCommitIdBytes.toString().split(',').join(', ') + ', ]'
    // console.log("git commit id byte string:", gitCommitIdBytesString)
    return gitCommitIdBytesString
}

const setEnvVariable = (filePath: string, name: string, value: string) => {
    // console.log("setting env variable", name, "in", filePath)
    const content = fs.readFileSync(filePath, 'utf8')
    let result = content
    // find and replace every declaration of the env variable
    // e.g.
    //
    // let ENV_ABC: u32 = 0;
    //
    // and ENV_ABC=3 in .env
    // becomes
    //
    // let ENV_ABC: u32 = 3;
    //

    name = 'env_' + name // add the env prefix to the name
    // names could be lower, upper or specific case
    for (const declaration of ['let', 'const']) {
        const regex = new RegExp(`${declaration}\\s+${name}:([^=]+)=[^;]+;`, 'gmsi')
        const regexMatch = regex.test(result)
        if (!regexMatch) {
            // console.log('no match for', regex, 'in', filePath);
            continue
        }
        // console.log('match for', regex, 'in', filePath);
        result = result.replaceAll(regex, `${declaration} ${name}:$1= ${value};`)
    }
    if (result === content) {
        // no change has been made
        return
    }
    console.log('set env variable', name, 'in', filePath)
    // else change has been made
    // then overwrite original file with the new content
    fs.writeFileSync(filePath, result)
}

const setEnvVariables = (filePaths: string[], env: Env) => {
    for (const filePath of filePaths) {
        const stats = fs.lstatSync(filePath)
        if (stats.isDirectory()) {
            // recurse into directory
            const files = fs.readdirSync(filePath)
            files.forEach((file) => {
                setEnvVariables([path.join(filePath, file)], env)
            })
        } else if (stats.isFile()) {
            // process file
            if (filePath.endsWith(contractSrcFileExtension)) {
                // loop through all env variables and set them
                for (const [name, value] of Object.entries(env)) {
                    // env vars have to start with the correct prefix, otherwise normal env vars (e.g. PWD, EDITOR, SHELL, etc.) would be propagated into the contract, which is not desired
                    setEnvVariable(filePath, name, value)
                }
            }
        } else {
            throw new Error(`Unknown file type: ${filePath}`)
        }
    }
}

const exec = (
    command: string,
    pipe?: boolean
): Promise<{
    stdout: string
    stderr: string
    code: number | null
}> => {
    console.log(`> ${command}`)

    const prc = spawn(command, {
        shell: true,
    })

    if (pipe || pipe === undefined) {
        prc.stdout.pipe(process.stdout)
        prc.stderr.pipe(process.stderr)
    }
    stdin.pipe(prc.stdin)

    const stdoutData: string[] = []
    const stderrData: string[] = []
    prc.stdout.on('data', (data) => {
        stdoutData.push(data.toString())
    })
    prc.stderr.on('data', (data) => {
        stderrData.push(data.toString())
    })

    return new Promise((resolve, reject) => {
        prc.on('close', function (code) {
            const output = {
                stdout: stdoutData.join(''),
                stderr: stderrData.join(''),
                code,
            }
            if (code === 0) {
                resolve(output)
            } else {
                reject(output)
            }
        })
    })
}

export async function processArgs(args: string[]) {
    const repoDir = path.join(__dirname, '../..')
    const contractsDir = path.join(__dirname, '../../contracts')
    const cratesDir = path.join(__dirname, '../../crates')
    const contractsCiVersion = '3.0.1'
    const crates = readdirSync(cratesDir, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name)
    const contracts = readdirSync(contractsDir, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name)
    const packages = [...crates, ...contracts]
    const packagePaths = [
        ...crates.map((p) => path.join(cratesDir, p)),
        ...contracts.map((p) => path.join(contractsDir, p)),
    ]
    const outputDir = path.join(repoDir, 'target/ink')

    // console.log(`repoDir: ${repoDir}`)
    // console.log(`contractsDir: ${contractsDir}`)
    // console.log(`cratesDir: ${cratesDir}`)
    // console.log(`outputDir: ${outputDir}`)

    const addContractOption = (yargs: yargs.Argv, customContracts?: string[]) => {
        return yargs.option('contract', {
            type: 'array',
            demand: false,
            desc: 'Target a specific crate/contract',
            default: customContracts || [],
            choices: customContracts || contracts,
        })
    }

    const addToolchainOption = (yargs: yargs.Argv) => {
        return yargs.option('toolchain', {
            type: 'string',
            demand: false,
            desc: 'Use a specific toolchain',
            default: '',
        })
    }

    const addDockerOption = (yargs: yargs.Argv) => {
        return yargs.option('docker', {
            type: 'boolean',
            demand: false,
            desc: 'Use docker contracts-ci image to build instead of local toolchain',
            default: false,
        })
    }

    const pullDockerImage = async () => {
        // check if the docker image is already pulled
        try {
            await exec(`docker images -q prosopo/contracts-ci-linux:${contractsCiVersion}`)
        } catch (e: any) {
            // if not, pull it
            await exec(`docker pull prosopo/contracts-ci-linux:${contractsCiVersion}`)
        }
    }

    const execCargo = async (argv: yargs.Arguments<{}>, cmd: string, dir?: string) => {
        const rest = argv._.slice(1).join(' ') // remove the first arg (the command) to get the rest of the args
        const toolchain = argv.toolchain ? `+${argv.toolchain}` : ''
        const relDir = path.relative(repoDir, dir || '..')

        if (cmd.startsWith('contract') && argv.contract) {
            throw new Error('Cannot run contract commands on specific packages')
        } else {
            for (const pkg of (argv.contract as string[]) || []) {
                // add the package to the end of the cmd
                cmd = `${cmd} --package ${pkg}`
            }
        }

        let script = ''
        if (argv.docker) {
            const manifestPath = path.join('/repo', relDir, '/Cargo.toml')
            pullDockerImage()
            script = `docker run --rm -v ${repoDir}:/repo --entrypoint /bin/sh prosopo/contracts-ci-linux:${contractsCiVersion} -c 'cargo ${toolchain} ${cmd} --manifest-path=${manifestPath} ${rest}'`
        } else {
            script = `cargo ${toolchain} ${cmd} ${rest}`
            if (dir) {
                script = `cd ${dir} && ${script}`
            }
        }

        let error = false
        try {
            await exec(script)
        } catch (e: any) {
            // error should be printed to console in the exec function
            // error out after cleanup
            error = true
        }

        if (argv.docker) {
            // docker ci image runs as root, so chown the target dir
            await exec(`cd ${repoDir} sudo chown -R $(whoami):$(whoami) ../target || true`)
        }

        await new Promise((resolve, reject) => {
            if (error) {
                reject()
            } else {
                resolve({})
            }
        })
    }

    await yargs
        .usage(
            `Usage: $0 [global options] <command> [options]

Cargo pass-through commands:
    test
    clean
    fmt --all --verbose
    clippy -- -D warnings -A clippy::too_many_arguments
    "contract <xyz>" <-- speech marks important! 'xyz' is the cargo contract command
`
        )
        .command(
            'expand',
            'Expand the contract (processing all macros, etc)',
            (yargs) => {
                // cannot build crates
                yargs = addContractOption(yargs, contracts)
                yargs = addToolchainOption(yargs)
                yargs = addDockerOption(yargs)
                return yargs
            },
            async (argv) => {
                const contracts = argv.contract as string[]
                delete argv.contract
                for (const contract in contracts) {
                    await exec(
                        `cd ${repoDir} && mkdir -p expanded && cd ${contractsDir}/${contract} && cargo expand ${argv._} > ${repoDir}/expanded/${contract}.rs`
                    )
                }
            },
            []
        )
        .command(
            'metadata',
            'Build the metadata',
            (yargs) => {
                // cannot build crates
                yargs = addContractOption(yargs, contracts)
                yargs = addToolchainOption(yargs)
                yargs = addDockerOption(yargs)
                return yargs
            },
            async (argv) => {
                const contracts = argv.contract as string[]
                delete argv.contract
                for (const contract in contracts) {
                    await exec(
                        `cd ${repoDir} && cargo metadata --manifest-path ${contractsDir}/${contract}/Cargo.toml ${argv._}`
                    )
                }
            },
            []
        )
        .command(
            'instantiate',
            'Instantiate the contract',
            (yargs) => {
                // cannot build crates
                yargs = addContractOption(yargs, contracts)
                yargs = addToolchainOption(yargs)
                yargs = addDockerOption(yargs)
                return yargs
            },
            async (argv) => {
                const contracts = argv.contract as string[]
                delete argv.contract
                for (const contract in contracts) {
                    await exec(
                        `cd ${repoDir} && cargo contract instantiate target/ink/${contract}/${contract}.contract ${argv._}`
                    )
                }
            },
            []
        )
        .command(
            'build',
            'Build the contracts',
            (yargs) => {
                // cannot build crates
                yargs = addContractOption(yargs, contracts)
                yargs = addToolchainOption(yargs)
                yargs = addDockerOption(yargs)
                return yargs
            },
            async (argv) => {
                // set the env variables using find and replace
                const env: Env = {
                    git_commit_id: await getGitCommitId(),
                }
                setEnvVariables(packagePaths, env)

                const contracts = argv.contract as string[]
                delete argv.contract

                for (const contract of contracts) {
                    const contractPath = `${contractsDir}/${contract}`
                    await execCargo(argv, 'contract build', contractPath)
                }
            },
            []
        )
        .command(
            '$0',
            'Pass-through to command cargo',
            (yargs) => {
                yargs = addToolchainOption(yargs)
                yargs = addDockerOption(yargs)
                return yargs
            },
            async (argv) => {
                if (argv._ && argv._.length == 0) {
                    throw new Error('No command specified')
                }
                const cmd = argv._[0] // the first arg (the command)
                if (!cmd) {
                    throw new Error('No command specified')
                }
                await execCargo(argv, cmd.toString())
            },
            []
        )
        .parserConfiguration({ 'unknown-options-as-args': true })
        .parse()
}

processArgs(process.argv.slice(2))
    .then(() => {
        process.exit(0)
    })
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
