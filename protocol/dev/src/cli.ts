import { spawn } from 'node:child_process'
import { readdirSync } from 'node:fs'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
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
import { hexToU8a } from '@polkadot/util'
import chalk from 'chalk'
import yargs, { type ArgumentsCamelCase, type Argv } from 'yargs'
import { hideBin } from 'yargs/helpers'

const contractSrcFileExtension = '.rs'
const dir = path.resolve()
// string to string map of env variables
interface Env {
    [key: string]: string
}

const cargoCmd = 'CARGO_REGISTRIES_CRATES_IO_PROTOCOL=sparse cargo'

// add in the git commit to env
const getGitCommitId = async () => {
    // get the git commit id
    const gitCommitIdResult = await exec('git rev-parse HEAD')
    const gitCommitId = gitCommitIdResult.stdout.trim()
    // console.log("git commit id:", gitCommitId)
    const gitCommitIdBytes = hexToU8a(gitCommitId)
    // console.log("git commit id bytes:", gitCommitIdBytes)
    const gitCommitIdBytesString: string = `[${gitCommitIdBytes.toString().split(',').join(', ')}, ]`
    // console.log("git commit id byte string:", gitCommitIdBytesString)
    return gitCommitIdBytesString
}

const setEnvVariable = async (filePath: string, name: string, value: string) => {
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

    name = `env_${name}` // add the env prefix to the name
    // names could be lower, upper or specific case
    for (const declaration of ['let', 'const']) {
        const regex = new RegExp(`${declaration}\\s+${name}:([^=]+)=[^;]+;`, 'gims')
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
    }
    console.log('set env variable', name, 'in', filePath)
    // else change has been made
    // then overwrite original file with the new content
    fs.writeFileSync(filePath, result)
}

const setEnvVariables = async (filePaths: string[], env: Env, argv: ArgumentsCamelCase, recursiveCall?: boolean) => {
    for (const filePath of filePaths) {
        const stats = fs.lstatSync(filePath)
        if (stats.isDirectory()) {
            // recurse into directory
            const files = fs.readdirSync(filePath)
            files.forEach(async (file) => {
                await setEnvVariables([path.join(filePath, file)], env, argv, true)
            })
        } else if (stats.isFile()) {
            // process file
            if (filePath.endsWith(contractSrcFileExtension)) {
                // loop through all env variables and set them
                for (const [name, value] of Object.entries(env)) {
                    // env vars have to start with the correct prefix, otherwise normal env vars (e.g. PWD, EDITOR, SHELL, etc.) would be propagated into the contract, which is not desired
                    await setEnvVariable(filePath, name, value)
                }
            }
        } else {
            throw new Error(`Unknown file type: ${filePath}`)
        }
    }
    if (!recursiveCall) {
        // finished setting env variables
        // format the code
        await exec('npm run cli -- fmt --verbose --all')
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
    console.log(chalk.bgBlack.cyan.bold(`> ${command}`))

    const prc = spawn(command, {
        shell: true,
    })

    if (pipe ?? true) {
        // https://github.com/microsoft/TypeScript/issues/44605
        // Building a second time fixes this issue
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        prc.stdout.pipe(process.stdout)
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        prc.stderr.pipe(process.stderr)
    }

    const stdoutData: string[] = []
    const stderrData: string[] = []
    prc.stdout.on('data', (data) => {
        stdoutData.push(data.toString())
    })
    prc.stderr.on('data', (data) => {
        stderrData.push(data.toString())
    })

    return new Promise((resolve, reject) => {
        prc.on('close', (code) => {
            prc.stdout.push('\n')
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
    const repoDir = path.join(dir, '../..')
    const contractsDir = path.join(dir, '../contracts')
    const cratesDir = path.join(dir, '../crates')
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
    const targetDir = path.join(repoDir, 'protocol/target')
    const cargoCacheDir = path.join(repoDir, 'protocol/cargo-cache')

    // console.log(`repoDir: ${repoDir}`)
    // console.log(`contractsDir: ${contractsDir}`)
    // console.log(`cratesDir: ${cratesDir}`)
    // console.log(`outputDir: ${outputDir}`)

    const addContractOption = (yargs: Argv, customContracts?: string[]) => {
        return yargs.option('contract', {
            type: 'array',
            demand: false,
            desc: 'Target a specific crate/contract',
            default: customContracts || [],
            choices: customContracts || contracts,
        })
    }

    const addToolchainOption = (yargs: Argv) => {
        return yargs.option('toolchain', {
            type: 'string',
            demand: false,
            desc: 'Use a specific toolchain',
            default: '',
        })
    }

    const addDockerOption = (yargs: Argv) => {
        return yargs.option('docker', {
            type: 'string',
            demand: false,
            desc: 'Use a docker contracts-ci image to build instead of local toolchain',
        })
    }

    const buildCargoCmd = (argv: ArgumentsCamelCase, cmd: string, dir?: string) => {
        const rest = argv._.slice(1).join(' ') // remove the first arg (the command) to get the rest of the args
        const toolchain = argv.toolchain ? `+${argv.toolchain}` : ''
        const relDir = path.relative(repoDir, dir || '..')
        const dockerImage = argv.docker === '' ? 'prosopo/contracts-ci-linux:3.0.1' : argv.docker ?? ''
        console.log(`dockerImage=${dockerImage}`)
        console.log(`cmd=${cmd}`)

        if (cmd.startsWith('contract') && argv.contract) {
            throw new Error('Cannot run contract commands on specific packages')
        }
        for (const pkg of (argv.contract as string[]) || []) {
            // add the package to the end of the cmd
            cmd = `${cmd} --package ${pkg}`
        }

        let script = ''
        if (dockerImage) {
            const manifestPath = path.join('/repo', relDir, '/Cargo.toml')
            const uid = process.getuid?.() ?? '1000'
            const gid = process.getgid?.() ?? '1000'
            script = `docker run --rm -u ${uid}:${gid} -v ${repoDir}:/repo -v ${cargoCacheDir}:/usr/local/cargo/registry ${dockerImage} ${cargoCmd} ${toolchain} ${cmd} --manifest-path=${manifestPath} ${rest}`
        } else {
            script = `${cargoCmd} ${toolchain} ${cmd} ${rest}`
            if (dir) {
                script = `cd ${dir} && ${script}`
            }
        }

        return script
    }

    await yargs(hideBin(args))
        .usage(
            `Usage: $0 [global options] <command> [options]

Cargo pass-through commands:
    test
    clean
    fmt --all --verbose
    clippy -- -- -D warnings -A clippy::too_many_arguments
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
                argv.contract = undefined
                await exec(`cd ${repoDir} && mkdir -p expanded`)
                for (const contract of contracts) {
                    const dir = `${contractsDir}/${contract}`
                    await exec(`${buildCargoCmd(argv, 'expand', dir)} > ${repoDir}/expanded/${contract}.rs`)
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
                argv.contract = undefined
                for (const contract of contracts) {
                    const dir = `${contractsDir}/${contract}`
                    await exec(`${buildCargoCmd(argv, 'contract metadata', dir)}`)
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
                argv.contract = undefined
                for (const contract of contracts) {
                    const dir = `${contractsDir}/${contract}`
                    await exec(`${buildCargoCmd(argv, 'contract instantiate', dir)}`)
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
                yargs = yargs.option('skip-env', {
                    type: 'boolean',
                    demand: false,
                    desc: 'Skip setting env variables',
                    default: false,
                })
                return yargs
            },
            async (argv) => {
                if (!argv.skipEnv) {
                    // set the env variables using find and replace
                    const env: Env = {
                        git_commit_id: await getGitCommitId(),
                    }
                    await setEnvVariables(packagePaths, env, argv)
                } else {
                    console.log('Skipping setting env variables')
                }

                const contracts = argv.contract as string[]
                argv.contract = undefined

                for (const contract of contracts) {
                    const contractPath = `${contractsDir}/${contract}`
                    await exec(buildCargoCmd(argv, 'contract build', contractPath))
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
                if (argv._ && argv._.length === 0) {
                    throw new Error('No command specified')
                }
                const cmd = String(argv._[0] || '') // the first arg (the command)
                if (!cmd) {
                    throw new Error('No command specified')
                }

                await exec(buildCargoCmd(argv, cmd.toString()))
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
