import { CronJob } from 'cron'
import { mnemonicValidate } from '@polkadot/util-crypto'
import { Tasks } from './tasks/tasks'
import { Environment } from './env'

async function main () {
    mnemonicValidate(process.env.PROVIDER_MNEMONIC as string)
    const env = new Environment(process.env.PROVIDER_MNEMONIC)
    await env.isReady()

    const tasks = new Tasks(env)
    const job = new CronJob(process.argv[2], () => {
        console.log('It works....')
        tasks.calculateCaptchaSolutions().catch(err => {
            console.error(err)
        })
    })

    job.start()
}

main().catch((error) => {
    console.error(error)
})
