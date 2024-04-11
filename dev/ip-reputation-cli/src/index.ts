/* eslint-disable regexp/optimal-quantifier-concatenation */
/* eslint-disable regexp/no-unused-capturing-group */
import { isMain } from '@prosopo/util'
import axios from 'axios'
import chalk from 'chalk'
import process from 'process'

function isValidIPv4(ip: string): boolean {
    const ipv4Pattern =
        // eslint-disable-next-line regexp/prefer-d
        /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).){2}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
    return ipv4Pattern.test(ip)
}

async function checkIP(ipAddress: string) {
    const url = 'https://api.abuseipdb.com/api/v2/check'
    const apiKey =
        process.env.ABUSEIPDB_API_KEY ||
        '3bfb7f5ea54f285e0b274d3b9c63f99decfb501748500bf7b23128bfbd6a7e02aa68535847c5b6a6'

    console.log(apiKey)

    try {
        const response = await axios
            .get(url, {
                headers: {
                    Accept: 'application/json',
                    Key: apiKey,
                },
                params: {
                    ipAddress,
                    maxAgeInDays: '90',
                },
            })
            .catch((error) => {
                console.error(chalk.red(`Error: ${error}`))
                throw new Error('Failed to fetch data from AbuseIPDB API.')
            })

        console.log(response)

        const data = response.data.data
        console.log(chalk.white(`Domain: ${data.domain}`))
        // More console.log statements for other pieces of information...

        // Conditional output based on abuse confidence score...
    } catch (error) {
        console.error(chalk.red(`Error: ${error}`))
    }
}

async function main() {
    // Assuming the IP address is always the first argument after the script name
    const ipAddress = process.argv[2] // Getting the third element directly

    if (!ipAddress) {
        console.error('No IP address provided.')
        process.exit(1)
    }

    // Check if the IP address is valid
    if (!isValidIPv4(ipAddress)) {
        console.error('Invalid IP address provided.')
        process.exit(1)
    }

    console.info(`IP Address: ${ipAddress}`)
    console.info('Checking IP address...')
    await checkIP(ipAddress)
}

// If main process
if (isMain(import.meta.url, 'provider')) {
    main()
        .then(() => {
            console.info('Running main process...')
        })
        .catch((error) => {
            console.error(error)
        })
}
