#!/usr/bin/env node
import express from 'express'
import { Environment } from '../env'
import { prosopoMiddleware } from '../api'
import { handleErrors } from '../errorHandler'
import { processArgs } from './argv'

const app = express()
app.use(express.json())
const port = 3000

async function main () {
    const env = new Environment(process.env.PROVIDER_MNEMONIC)
    await env.isReady()
    const args = await processArgs(process.argv.slice(2), env)

    if (args.api) {
        app.use(prosopoMiddleware(env))
        app.use(handleErrors)
        app.listen(port, () => {
            console.log(`Prosopo app listening at http://localhost:${port}`)
        })
    } else {
        process.exit()
    }
}

main()
    .catch((error) => {
        console.error(error)
    })
