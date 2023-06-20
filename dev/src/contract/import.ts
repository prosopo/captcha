import { ExecOutput, exec } from '../util'

async function importContract(relPathToABIs: string, relPathToOutput: string): Promise<ExecOutput> {
    //TODO import typechain when it's working https://github.com/Brushfam/typechain-polkadot/issues/73
    const cmd = `npx @727-ventures/typechain-polkadot --in ${relPathToABIs} --out ${relPathToOutput}`
    return exec(cmd)
}

export default importContract
