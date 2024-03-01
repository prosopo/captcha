import { ProsopoApiError } from '@prosopo/common'
export async function streamToJson(stream: ReadableStream<Uint8Array>): Promise<Record<any, any>> {
    return await new Response(stream).json()
}

export const errorHandler = async <T>(response: Response) => {
    if (!response.ok) {
        throw new ProsopoApiError('API.BAD_REQUEST', { context: { error: `HTTP error! status: ${response.status}` } })
    }
    if (response.body && !response.bodyUsed) {
        const data = await streamToJson(response.body)

        if (data.status === 'error') {
            throw new ProsopoApiError('API.BAD_REQUEST', {
                context: { error: `HTTP error! status: ${data.data.message} ` },
            })
        }
        return data as T
    }
    return {} as T
}
