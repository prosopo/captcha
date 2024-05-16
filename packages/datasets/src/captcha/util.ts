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
import { ProsopoApiError, ProsopoEnvError } from '@prosopo/common'

export async function downloadImage(url: string): Promise<Uint8Array> {
    try {
        const response = await fetch(url)
        if (!response.ok) {
            throw new ProsopoApiError('API.BAD_REQUEST', {
                context: { error: `Network response was not ok, status: ${response.status}`, url },
            })
        }
        const buffer = await response.arrayBuffer()
        return new Uint8Array(buffer)
    } catch (err) {
        throw new ProsopoEnvError('DATABASE.IMAGE_GET_FAILED', { context: { error: err } })
    }
}
