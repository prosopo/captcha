import { AdminApiPaths } from '@prosopo/types'

// Helper function to handle the response: TODO - make it not any
async function handleResponse(response: any) {
    if (!response.ok) {
        const errorMessage = await response.text()
        throw new Error(errorMessage)
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

export async function updateDataset(BASE_URL: string, additionalHeaders: Record<string, string> = {}, jsonFile: any) {
    // convert jsonFile to string
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
    additionalHeaders: Record<string, string> = {},
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
