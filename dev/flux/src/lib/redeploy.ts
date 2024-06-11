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
import { main as authMain, verifyLogin } from './auth.js'
import { errorHandler } from '../errorHandler.js'
import { getLogger } from '@prosopo/common'
import { getZelIdAuthHeader } from './url.js'

const log = getLogger(`Info`, `deploy.js`)

interface ResponseSoftRedeploy {
    status: string
    data: { message: string }
}

const reDeploy = async (
    zelid: string,
    signature: string,
    loginPhrase: string,
    url: URL,
    appName: string,
    hard = false
) => {
    const apiUrl = new URL(`${url}apps/redeploy/${appName}/${hard}/true`).toString()
    const Zelidauth = getZelIdAuthHeader(zelid, signature, loginPhrase)
    const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
            Zelidauth: Zelidauth,
        },
    })
    return await errorHandler<ResponseSoftRedeploy>(response)
}
export const main = async (publicKey: string, privateKey: Uint8Array, appName: string, ip?: string, hard?: boolean) => {
    try {
        // Get auth details
        const { nodeAPIURL, nodeLoginPhrase, nodeSignature } = await authMain(publicKey, privateKey, appName, ip)

        // Login to the node
        await verifyLogin(publicKey, nodeSignature, nodeLoginPhrase, nodeAPIURL)

        // Soft redeploy the app
        const redeployResponse = await reDeploy(publicKey, nodeSignature, nodeLoginPhrase, nodeAPIURL, appName, hard)

        log.info(redeployResponse)
        process.exit(0)
    } catch (error) {
        log.error('An error occurred:', error)
        process.exit(1)
    }
}
