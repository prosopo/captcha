import consola, { LogLevel } from 'consola'
import path from 'path'
import yargs from 'yargs'
import process from 'process';
import { readdirSync } from 'fs'
import { spawn } from 'child_process'

const exec = (command: string) => {

    console.log(`> ${command}`)

    const prc = spawn(command, {
        shell: true,
    });

    prc.stdout.setEncoding('utf8');
    prc.stdout.on('data', function (data) {
        const str = data.toString()
        const lines = str.split(/(\r?\n)/g);
        console.log(lines.join(""));
    });
    prc.stderr.setEncoding('utf8');
    prc.stderr.on('data', function (data) {
        const str = data.toString()
        const lines = str.split(/(\r?\n)/g);
        console.error(lines.join(""));
    });
    
    return new Promise((resolve, reject) => {
        prc.on('close', function (code) {
            console.log("")
            if (code === 0) {
                resolve(code);
            } else {
                reject(code);
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

    const contractsDir = path.join(__dirname, '../../contracts')
    const cratesDir = path.join(__dirname, '../../crates')
    const crates = readdirSync(cratesDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
    const contracts = readdirSync(contractsDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

    const addContractOption = (yargs: yargs.Argv) => {
        return yargs
        .option('contract', {
            type: 'array',
            demand: false,
            desc: 'Build a specific contract',
            default: contracts,
            choices: contracts,
        })
    }

    const addCrateOption = (yargs: yargs.Argv) => {
        return yargs
        .option('crate', {
            type: 'array',
            demand: false,
            desc: 'Build a specific crate',
            default: crates,
            choices: crates,
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

    await yargs
        // .usage('Usage: $0 [global options] <command> [options]')
        .command(
            'build',
            'Build the contracts',
            (yargs) => {
                // cannot build crates
                yargs = addContractOption(yargs)
                yargs = addToolchainOption(yargs)
                yargs = addReleaseOption(yargs)
                return yargs
            },
            async (argv) => {
                const mode = argv.release ? '--release' : ''
                const toolchain = argv.toolchain ? `+${argv.toolchain}` : ''

                for(const contract of argv.contract as string[]) {
                    const cmd = `cd ${contractsDir}/${contract} && cargo ${toolchain} contract build ${mode}`;
                    await exec(cmd)
                }
            },
            []
        ).command(
            'test',
            'Test the crates and contracts',
            (yargs) => {
                yargs = addCrateOption(yargs)
                yargs = addContractOption(yargs)
                yargs = addToolchainOption(yargs)
                return yargs
            },
            async (argv) => {
                const toolchain = argv.toolchain ? `+${argv.toolchain}` : ''

                for(const contract of argv.contract as string[]) {
                    const cmd = `cd ${contractsDir}/${contract} && cargo ${toolchain} test`;
                    await exec(cmd)
                }

                for(const crate of argv.crate as string[]) {
                    const cmd = `cd ${cratesDir}/${crate} && cargo ${toolchain} test`;
                    await exec(cmd)
                }
            },
            []
        ).command(
            'fmt',
            'Format the crates and contracts',
            (yargs) => {
                yargs = addCrateOption(yargs)
                yargs = addToolchainOption(yargs)
                yargs = addContractOption(yargs)
                return yargs
            },
            async (argv) => {
                const toolchain = argv.toolchain ? `+${argv.toolchain}` : ''

                for(const contract of argv.contract as string[]) {
                    const cmd = `cd ${contractsDir}/${contract} && cargo ${toolchain} fmt`;
                    await exec(cmd)
                }

                for(const crate of argv.crate as string[]) {
                    const cmd = `cd ${cratesDir}/${crate} && cargo ${toolchain} fmt`;
                    await exec(cmd)
                }
            },
            []
        ).command(
            'clippy',
            'Clippy the crates and contracts',
            (yargs) => {
                yargs = addCrateOption(yargs)
                yargs = addToolchainOption(yargs)
                yargs = addContractOption(yargs)
                yargs = addFixOption(yargs)
                return yargs
            },
            async (argv) => {
                const toolchain = argv.toolchain ? `+${argv.toolchain}` : ''
                const fix = argv.fix ? '--fix' : ''

                for(const contract of argv.contract as string[]) {
                    const cmd = `cd ${contractsDir}/${contract} && cargo ${toolchain} clippy ${fix}`;
                    await exec(cmd)
                }

                for(const crate of argv.crate as string[]) {
                    const cmd = `cd ${cratesDir}/${crate} && cargo ${toolchain} clippy ${fix}`;
                    await exec(cmd)
                }
            },
            []
        )
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