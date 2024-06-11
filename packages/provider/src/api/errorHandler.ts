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
// We need the unused params to make express recognise this function as an error handler
import { NextFunction, Request, Response } from 'express'
import { ProsopoApiError, ProsopoBaseError } from '@prosopo/common'
import { ZodError } from 'zod'

export const handleErrors = (
    err: ProsopoApiError | SyntaxError | ZodError,
    request: Request,
    response: Response,
    next: NextFunction
) => {
    const code = 'code' in err ? err.code : 400
    // unwrap the errors to get the actual error message
    while (err instanceof ProsopoBaseError && err.context && err.context.error) {
        err = err.context.error
    }
    const message = err.message

    response.writeHead(code, JSON.stringify(message), { 'content-type': 'application/json' }).end()
}
