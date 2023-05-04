// Copyright 2021-2022 Prosopo (UK) Ltd.
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
import { ProsopoApiError } from '@prosopo/common'

export const handleErrors = (err: ProsopoApiError, req, res, next) => {
    let message = err.message
    try {
        message = JSON.parse(err.message)
    } catch {
        console.debug('Invalid JSON error message')
    }
    return res.status(err.code).json({
        message,
        name: err.name,
    })
}
