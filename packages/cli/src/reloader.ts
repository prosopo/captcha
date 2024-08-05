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
import type { AwaitedProcessedArgs } from './argv.js'
import type { KeyringPair } from '@polkadot/keyring/types'
import { LogLevel, getLogger } from '@prosopo/common'
import type { ProsopoConfigOutput } from '@prosopo/types'
import { ProviderEnvironment } from '@prosopo/env'
import type { Server } from 'node:net'
import { loadEnv } from './env.js'
import { start } from './start.js'
import fs from 'fs'

const log = getLogger(LogLevel.enum.info, 'CLI')

export default class ReloadingAPI {
    private _envWatcher: any
    private _envPath: string
    private _config: ProsopoConfigOutput
    private _pair: KeyringPair
    private _processedArgs: AwaitedProcessedArgs
    private api: Server | undefined
    private _restarting: boolean

    constructor(envPath: string, config: ProsopoConfigOutput, pair: KeyringPair, processedArgs: AwaitedProcessedArgs) {
        this._envPath = envPath
        this._config = config
        this._pair = pair
        this._processedArgs = processedArgs
        this._restarting = false
    }

    public async start() {
        log.info('Starting API')
        this._envWatcher = await this._watchEnv()
        loadEnv()
        const env = new ProviderEnvironment(this._config, this._pair)
        await env.isReady()
        this.api = await start(env, !!this._processedArgs.adminApi)
    }

    public async stop() {
        log.info('Stopping API')
        return new Promise((resolve) => {
            if (this.api) {
                this.api.close(resolve)
            }
        })
    }

    private async _watchEnv() {
        return fs.watchFile(this._envPath, async () => {
            log.info(`env file change detected. Restarting: ${this._restarting}`)
            if (!this._restarting) {
                this._restarting = true
                await this.stop()
                loadEnv()
                await this.start()
                this._restarting = false
            }
        })
    }
}
