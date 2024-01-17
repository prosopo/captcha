import { AdminApiPaths, DatasetRaw } from '@prosopo/types'

// Helper function to handle the response: TODO - make it not any
async function handleResponse(response: any) {
    if (!response.ok) {
        const errorMessage = await response.text()
        throw new Error(errorMessage)
    }
    return response.json()
}

export async function batchCommit(BASE_URL: string) {
    const response = await fetch(`${BASE_URL}${AdminApiPaths.BatchCommit}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    })
    return handleResponse(response)
}

export async function updateDataset(BASE_URL: string, jsonFile: DatasetRaw) {
    const response = await fetch(`${BASE_URL}${AdminApiPaths.UpdateDataset}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(jsonFile),
    })
    return handleResponse(response)
}

export async function providerDeregister(BASE_URL: string) {
    const response = await fetch(`${BASE_URL}${AdminApiPaths.ProviderDeregister}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    })
    return handleResponse(response)
}

export async function providerUpdate(
    BASE_URL: string,
    url: string,
    fee: number,
    payee: string,
    value: number,
    address: string
) {
    const response = await fetch(`${BASE_URL}${AdminApiPaths.ProviderUpdate}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, fee, payee, value, address }),
    })
    return handleResponse(response)
}
