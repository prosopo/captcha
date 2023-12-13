import { LogLevel, getLogger } from '@prosopo/common'
import { handleErrors } from '@prosopo/cli'
import { i18nMiddleware } from '@prosopo/common'
import { prosopoRouter } from './api.js'
import cors from 'cors'
import express from 'express'
const logger = getLogger(LogLevel.enum.info, 'prosopo:provider-mock:start.ts')

async function startApi() {
    const apiApp = express()
    const apiPort = '9229'

    apiApp.use(cors())
    apiApp.use(express.json())
    apiApp.use(i18nMiddleware({}))
    apiApp.use(prosopoRouter())

    apiApp.use(handleErrors)
    apiApp.listen(apiPort, () => {
        logger.info(`Prosopo app listening at http://localhost:${apiPort}`)
    })
}

startApi().catch((error) => {
    logger.error(error)
    process.exit(1)
})
