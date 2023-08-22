const { exec } = require('child_process')

// Function to execute a shell command and return it as a Promise.
function execShellCommand(cmd) {
    console.log(`About to run: ${cmd}`)
    return new Promise((resolve, reject) => {
        exec(cmd, (error, stdout, stderr) => {
            console.log(`Finished running: ${cmd}`)
            if (error) {
                console.warn(`Error executing command: ${cmd}`)
                reject(error)
            }
            resolve(stdout ? stdout : stderr)
        })
    })
}

async function main() {
    try {
        console.log('Check provider command executed.')
        const current_provider = await execShellCommand(
            'node provider_cli_bundle.main.bundle.js provider_details --address 5EjTA28bKSbFPPyMbUjNtArxyqjwq38r1BapVmLZShaqEedV'
        )
        console.log('raw output \n\n\n\n', current_provider, 'end of raw output \n\n\n\n')

        if (!current_provider.includes(`"status": "Active"`)) {
            console.log('Registration command executed.')
            const registration = await execShellCommand(
                'node provider_cli_bundle.main.bundle.js provider_register --url http://localhost:9229 --fee 0 --payee Provider'
            )
            console.log(registration)
        } else {
            console.log('----------------\n\n\n\nProvider already registered. \n\n\n')
        }

        console.log('Set data command executed.')
        const dataset = await execShellCommand(
            'node provider_cli_bundle.main.bundle.js provider_set_data_set --file ./128_target_generated.json'
        )
        console.log(dataset)

        await execShellCommand('node provider_cli_bundle.main.bundle.js --api')
        console.log('API command executed.')
    } catch (error) {
        console.error(`Error: `, error)
    }
}

main()
