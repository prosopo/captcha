import { exec } from 'child_process'

async function importContract(absPathToABIs: string, absPathToOutput: string): Promise<void> {
    //TODO import typechain when it's working https://github.com/Brushfam/typechain-polkadot/issues/73
    const cmd = `npx @727-ventures/typechain-polkadot --in ${absPathToABIs} --out ${absPathToOutput}`
    console.log(`Running ${cmd}`)
    return new Promise((resolve, reject) => {
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                console.error(`${error.message}`)
                return reject(error)
            }

            if (stderr) {
                console.warn(`${stderr}`)
                return resolve()
            }

            console.log(`${stdout}`)
            resolve()
        })
    })
}

export default importContract
