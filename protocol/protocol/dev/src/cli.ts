import consola, { LogLevel } from 'consola'
import path from 'path'
import yargs from 'yargs'
import process from 'process';
import { readdirSync } from 'fs'
import { spawn } from 'child_process'
import { stdout, stderr, stdin } from 'process';

const exec = (command: string, pipe?: boolean) => {

    console.log(`> ${command}`)

    const prc = spawn(command, {
        shell: true,
    });

    if(pipe || pipe === undefined) {
        prc.stdout.pipe(process.stdout);
        prc.stderr.pipe(process.stderr);
    }
    stdin.pipe(prc.stdin);

    const stdoutData: string[] = [];
    const stderrData: string[] = [];
    prc.stdout.on('data', (data) => {
        stdoutData.push(data.toString());
    })
    prc.stderr.on('data', (data) => {
        stderrData.push(data.toString());
    })

    return new Promise((resolve, reject) => {
        prc.on('close', function (code) {
            console.log("")
            const output = {
                stdout: stdoutData.join(''),
                stderr: stderrData.join(''),
                code,
            }
            if (code === 0) {
                resolve(output);
            } else {
                reject(output);
            }
        });
    });
}

export async function processArgs(args: string[]) {
    // const parsed = await yargs.option('logLevel', {
    //     describe: 'set log level',
    //     choices: Object.keys(LogLevel),
    // }).argv

    // const logger = consola.create({ level: LogLevel[parsed.logLevel || 'Info'] })

    const repoDir = path.join(__dirname, '../..')
    const contractsDir = path.join(__dirname, '../../contracts')
    const cratesDir = path.join(__dirname, '../../crates')
    const contractsCiVersion = '41abf440-20230503'
    const relDirContracts = path.relative(repoDir, contractsDir)
    const relDirCrates = path.relative(repoDir, cratesDir)
    const crates = readdirSync(cratesDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
    const contracts = readdirSync(contractsDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
    const packages = [...crates, ...contracts]

    const addPackageOption = (yargs: yargs.Argv, customPackages?: string[]) => {
        return yargs
        .option('package', {
            type: 'array',
            demand: false,
            desc: 'Target a specific crate/contract',
            default: customPackages || [],
            choices: customPackages || packages,
        })
    }

    const addToolchainOption = (yargs: yargs.Argv) => {
        return yargs
        .option('toolchain', {
            type: 'string',
            demand: false,
            desc: 'Use a specific toolchain',
            default: '',
        })
    }

    const addReleaseOption = (yargs: yargs.Argv) => {
        return yargs
        .option('release', {
            type: 'boolean',
            demand: false,
            desc: 'Build in release mode',
            default: false,
        })
    }

    const addFixOption = (yargs: yargs.Argv) => {
        return yargs
        .option('fix', {
            type: 'boolean',
            demand: false,
            desc: 'Fix the code',
            default: false,
        })
    }

    const addDockerOption = (yargs: yargs.Argv) => {
        return yargs
        .option('docker', {
            type: 'boolean',
            demand: false,
            desc: 'Use docker contracts-ci image to build instead of local toolchain',
            default: false,
        })
    }

    const pullDockerImage = async () => {
        // check if the docker image is already pulled
        try {
            await exec(`docker images -q paritytech/contracts-ci-linux:${contractsCiVersion}`)
        } catch(e: any) {
            // if not, pull it
            await exec(`docker pull paritytech/contracts-ci-linux:${contractsCiVersion}`)
        }
    }

    const execCargo = async (argv: yargs.Arguments<{}>, cmd: string, cmdArgs: string, dir?: string) => {
        const toolchain = argv.toolchain ? `+${argv.toolchain}` : ''
        const relDir = path.relative(repoDir, dir || "..")

        if(cmd.startsWith("contract") && argv.package) {
            throw new Error("Cannot run contract commands on specific packages")
        } else {
            for(const pkg of argv.package as string[] || []) {
                // add the package to the end of the cmd
                cmd = `${cmd} --package ${pkg}`
            }
        }

        let script: string = "";
        if(argv.docker) {
            pullDockerImage();
            script = `docker run --rm -v ${repoDir}:/repo paritytech/contracts-ci-linux:${contractsCiVersion} cargo ${toolchain} ${cmd} --manifest-path=/repo/${relDir}/Cargo.toml ${cmdArgs}`
        } else {
            script = `cargo ${toolchain} ${cmd} ${cmdArgs}`
            if(dir) {
                script = `cd ${dir} && ${script}`
            }
        }

        let error = false;
        try {
            await exec(script)
        } catch(e: any) {
            // error should be printed to console in the exec function
            // error out after cleanup
            error = true;
        }

        await new Promise((resolve, reject) => {
            if(error) {
                reject()
            } else {
                resolve({})
            }
        })
    }

    await yargs
        .usage('Usage: $0 [global options] <command> [options]')
        .command(
            'instantiate',
            'Instantiate the contract',
            (yargs) => {
                return yargs.option('package', {
                    type: 'string',
                    demand: true,
                    desc: 'Target a specific package',
                    choices: contracts,
                })
            },
            async (argv) => {
                const [, ...cmdArgsArray] = argv._ // strip the command name
                let cmdArgs = cmdArgsArray.join(' ')

                const contract = argv.package;

                await exec(`cd ${repoDir} && cargo contract instantiate target/ink/${contract}/${contract}.contract ${cmdArgs}`)
            },
            []
        )
        .command(
            'build',
            'Build the contracts',
            (yargs) => {
                // cannot build crates
                yargs = addPackageOption(yargs, contracts)
                yargs = addToolchainOption(yargs)
                yargs = addReleaseOption(yargs)
                yargs = addDockerOption(yargs)
                return yargs
            },
            async (argv) => {
                const mode = argv.release ? '--release' : ''

                const cmd = 'contract build'
                const cmdArgs = `${mode}`

                const contracts = argv.package as string[];
                delete argv.package;
                for(const contract of contracts) {
                    await execCargo(argv, cmd, cmdArgs, `${contractsDir}/${contract}`)
                }
            },
            []
        ).command(
            'test',
            'Test the crates and contracts',
            (yargs) => {
                yargs = addPackageOption(yargs)
                yargs = addToolchainOption(yargs)
                yargs = addDockerOption(yargs)
                return yargs
            },
            async (argv) => {
                const cmd = 'test'
                const cmdArgs = ''

                await execCargo(argv, cmd, cmdArgs)
            },
            []
        ).command(
            'fmt',
            'Format the crates and contracts',
            (yargs) => {
                yargs = addPackageOption(yargs)
                yargs = addToolchainOption(yargs)
                yargs = addDockerOption(yargs)
                yargs = yargs.option('check', {
                    type: 'boolean',
                    demand: false,
                    desc: 'Check the code instead of making changes',
                    default: false,
                })
                return yargs
            },
            async (argv) => {
                const check = argv.check ? '--check' : ''
                const cmd = 'fmt'
                const cmdArgs = `--all --verbose ${check}`
                
                await execCargo(argv, cmd, cmdArgs)
            },
            []
        ).command(
            'clippy',
            'Clippy the crates and contracts',
            (yargs) => {
                yargs = addPackageOption(yargs)
                yargs = addToolchainOption(yargs)
                yargs = addFixOption(yargs)
                yargs = addDockerOption(yargs)
                return yargs
            },
            async (argv) => {
                const fix = argv.fix ? '--fix --allow-dirty --allow-staged' : ''
                
                const cmd = 'clippy'
                const cmdArgs = `${fix} -- -D warnings `

                await execCargo(argv, cmd, cmdArgs)
            },
            []
        )
        .parserConfiguration({'unknown-options-as-args': true})
        .parse();
}

processArgs(process.argv.slice(2))
    .then(() => {
        process.exit(0)
    })
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })