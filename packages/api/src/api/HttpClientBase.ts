// Copyright 2021-2023 Prosopo (UK) Ltd.
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
export class HttpClientBase {
    protected readonly baseURL: string

    constructor(baseURL: string, prefix = '') {
        this.baseURL = baseURL + prefix
    }

    protected async fetch<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
        try {
            const response = await fetch(this.baseURL + input, init)
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }
            return this.responseHandler<T>(response)
        } catch (error) {
            return this.errorHandler(error)
        }
    }

    protected async responseHandler<T>(response: Response): Promise<T> {
        console.log('API REQUEST', response.url)
        try {
            return await response.json()
        } catch (error) {
            console.error('Error parsing JSON:', error)
            throw error
        }
    }

    protected errorHandler(error: any): Promise<never> {
        console.error('API REQUEST ERROR', error)
        return Promise.reject(error)
    }

    protected async post<T, U>(input: RequestInfo, body: U, init?: RequestInit): Promise<T> {
        const headers = { 'Content-Type': 'application/json', ...(init?.headers || {}) }
        try {
            const response = await fetch(this.baseURL + input, {
                method: 'POST',
                body: JSON.stringify(body),
                headers,
                ...init,
            })
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }
            return this.responseHandler<T>(response)
        } catch (error) {
            return this.errorHandler(error)
        }
    }
}

export default HttpClientBase
