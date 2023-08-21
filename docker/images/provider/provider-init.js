const { exec } = require('child_process')

// Function to execute a shell command and return it as a Promise.
function execShellCommand(cmd) {
    return new Promise((resolve, reject) => {
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                console.warn(`Error executing command: ${cmd}`)
                reject(error)
            } else {
                resolve(stdout ? stdout : stderr)
            }
        })
    })
}

async function main() {
    try {
        console.log('Starting provider initialization...')
        console.log(`Provider address`)
        const provider_address = process.env.PROVIDER_ADDRESS

        console.log(`Provider details`)
        const provider_details = await execShellCommand(
            `node provider_cli_bundle.main.bundle.js cli -- provider_details --address ${provider_address}`
        )
        console.log(provider_details)

        console.log('Registration command executed.')
        const registration = await execShellCommand(
            'node provider_cli_bundle.main.bundle.js cli -- provider_register --url http://localhost:9229 --fee 0 --payee Provider'
        )

        console.log('All providers command executed.')
        const all_providers = await execShellCommand('node provider_cli_bundle.main.bundle.js cli -- provider_accounts')

        console.log('Set data command executed.')
        const dataset = await execShellCommand(
            'node provider_cli_bundle.main.bundle.js cli -- provider_set_data_set --file ./128_target_generated.json'
        )

        await execShellCommand('node provider_cli_bundle.main.bundle.js --api')
        console.log('API command executed.')
    } catch (error) {
        console.error(`Error: ${error.message}`)
    }
}

main()
