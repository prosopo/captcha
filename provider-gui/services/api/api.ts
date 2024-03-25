import { ProsopoApiError } from '@prosopo/common'
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
import { AdminApiPaths } from '@prosopo/types'

async function handleResponse(response: Response) {
    if (!response.ok) {
        const errorMessage = await response.text()
        throw new ProsopoApiError('API.BAD_REQUEST', { context: { error: errorMessage } })
    }
    return response.json()
}

export async function batchCommit(BASE_URL: string, additionalHeaders: Record<string, string> = {}) {
    const response = await fetch(`${BASE_URL}${AdminApiPaths.BatchCommit}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...additionalHeaders,
        },
    })
    return handleResponse(response)
}

export async function updateDataset(BASE_URL: string, additionalHeaders: Record<string, string>, jsonFile: any) {
    const jsonFileString = JSON.stringify(jsonFile)
    const response = await fetch(`${BASE_URL}${AdminApiPaths.UpdateDataset}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...additionalHeaders,
        },
        body: jsonFileString,
    })
    return handleResponse(response)
}

export async function providerDeregister(BASE_URL: string, additionalHeaders: Record<string, string> = {}) {
    const response = await fetch(`${BASE_URL}${AdminApiPaths.ProviderDeregister}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...additionalHeaders,
        },
    })
    return handleResponse(response)
}

export async function providerUpdate(
    BASE_URL: string,
    additionalHeaders: Record<string, string>,
    updateData: {
        url: string
        address: string
        fee?: string
        payee?: string
        value?: string
    }
) {
    const body: { url: string; address: string; fee?: string; payee?: string; value?: string } = updateData

    const response = await fetch(`${BASE_URL}${AdminApiPaths.ProviderUpdate}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...additionalHeaders,
        },
        body: JSON.stringify(body),
    })

    return handleResponse(response)
}
