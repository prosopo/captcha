// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of provider <https://github.com/prosopo-io/provider>.
//
// provider is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// provider is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with provider.  If not, see <http://www.gnu.org/licenses/>.

import {z} from 'zod'

export const ProsopoConfigSchema = z.object({
    logLevel: z.string(),
    contract: z.object({abi: z.string()}),
    defaultEnvironment: z.string(),
    networks: z.object({
        development: z.object({
            endpoint: z.string().url(),
            contract: z.object({
                address: z.string(),
                deployer: z.object({
                    address: z.string()
                }),
                name: z.string()
            }),
            accounts: z.array(z.string())
        })
    }),
    captchas: z.object({
        solved: z.object({
            count: z.number().positive()
        }),
        unsolved: z.object({
            count: z.number().nonnegative()
        })
    }),
    captchaSolutions: z.object({
        requiredNumberOfSolutions: z.number().positive().min(2),
        solutionWinningPercentage: z.number().positive().max(100),
        captchaFilePath: z.string()
    }),
    database: z.object({
        development: z.object({
            type: z.string(),
            endpoint: z.string().url(),
            dbname: z.string()
        })
    }),
    assetsResolver: z.object({
        absolutePath: z.string(),
        basePath: z.string(),
    }),
    server: z.object({
        baseURL: z.string().url(),
    })
})

export type ProsopoConfig = z.infer<typeof ProsopoConfigSchema>
