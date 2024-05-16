// Copyright 2021-2024 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import { LogLevel, getLogger } from '@prosopo/common'
import { handleErrors } from '@prosopo/provider'
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
