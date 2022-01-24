#!/usr/bin/env node
import { Tasks } from '../src/tasks/tasks'
import { Environment } from '../src/env'
require('dotenv').config()

async function main () {
    const env = new Environment('//Alice')
    await env.isReady()
    const tasks = new Tasks(env)
    await tasks.providerAccounts()
    await tasks.dappAccounts()
    process.exit()
}

main()
    .catch((error) => {
        console.error(error)
        process.exit()
    })
