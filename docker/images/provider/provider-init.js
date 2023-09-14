import { exec } from 'child_process'

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
            resolve(stdout || stderr)
        })
    })
}

async function main() {
    try {
        console.log('Check provider command executed.')
        const currentProvider = await execShellCommand(
            `node provider.cli.bundle.js provider_details --address ${process.env.PROVIDER_ADDRESS}`
        )
        console.log('Raw output:', currentProvider)

        if (!currentProvider.includes('"status": "Active"')) {
            console.log('Registration command executed.')
            const registration = await execShellCommand(
                `node provider.cli.bundle.js provider_register --url ${process.env.API_BASE_URL} --fee 0 --payee Provider`
            )
            console.log(registration)
        } else {
            console.log('----------------\nProvider already registered.')
        }

        console.log('Set data command executed.')
        const dataSet = await execShellCommand(
            'node provider.cli.bundle.js provider_set_data_set --file ./128_target_generated.json'
        )
        console.log(dataSet)

        await execShellCommand('node provider.cli.bundle.js --api')
        console.log('API command executed.')
    } catch (error) {
        console.error('Error:', error)
    }
}

main()
