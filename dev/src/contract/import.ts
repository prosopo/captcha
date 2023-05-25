import { exec } from 'child_process'

function importContract(absPathToABIs: string, absPathToOutput: string) {
    //TODO import typechain when it's working https://github.com/Brushfam/typechain-polkadot/issues/73
    const cmd = `npx @727-ventures/typechain-polkadot --in ${absPathToABIs} --out ${absPathToOutput}`
    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            console.error(`error: ${error.message}`)
            return
        }

        if (stderr) {
            console.error(`stderr: ${stderr}`)
            return
        }

        console.log(`stdout:\n${stdout}`)
    })
}

export default importContract
