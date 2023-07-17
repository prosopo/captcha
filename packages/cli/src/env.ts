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
import { LogLevel, logger } from '@prosopo/common'
import { getEnv } from './process.env'
import dotenv from 'dotenv'
import path from 'path'

export function loadEnv(rootDir?: string, filename?: string, filePath?: string) {
    const envPath = getEnvFile(path.resolve(rootDir || '.'), filename, filePath)
    const args = { path: envPath }
    dotenv.config(args)
}

export function getEnvFile(rootDir?: string, filename = '.env', filepath = path.join(__dirname, '../..')) {
    const log = logger(LogLevel.Info, 'cli.env')
    const env = getEnv()
    const envPath = path.join(rootDir || filepath, `${filename}.${env}`)
    log.info(`Env path: ${envPath}`)
    return envPath
}
