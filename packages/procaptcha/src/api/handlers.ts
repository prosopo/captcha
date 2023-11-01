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
export class ProsopoApiError extends Error {
    cause: Response | Error
    constructor(error: Response | Error, context?: string, ...params: any[]) {
        // If error is an instance of Response, it's an HTTP error
        if (error instanceof Response) {
            super(`HTTP Error: ${error.status} ${error.statusText}`)
            this.cause = error
        } else {
            // Otherwise, it's a network error, or something else
            super(error.message || 'Unknown API Error')
            this.cause = error
        }

        this.name = (context && `${ProsopoApiError.name}@${context}`) || ProsopoApiError.name

        console.error('\n********************* ERROR *********************\n')
        console.error(this.cause, this.stack, ...params)
    }
}
