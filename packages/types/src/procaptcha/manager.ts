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
import { ApiParams } from '../provider/index.js'
import { z } from 'zod'

export const ProcaptchaOutputSchema = z.object({
    [ApiParams.commitmentId]: z.string().optional(),
    [ApiParams.providerUrl]: z.string().optional(),
    [ApiParams.dapp]: z.string(),
    [ApiParams.user]: z.string(),
    [ApiParams.blockNumber]: z.number().optional(),
})

/**
 * The information produced by procaptcha on completion of the captcha process,
 * whether verified by smart contract, a pending commitment in the cache of a
 * provider or a captcha challenge.
 */
export type ProcaptchaOutput = z.infer<typeof ProcaptchaOutputSchema>

export const ProcaptchaResponse = z.object({
    [ApiParams.procaptchaResponse]: ProcaptchaOutputSchema,
})
