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
import { LogLevel, getLogger } from '@prosopo/common'
import { ProviderEnvironment } from '@prosopo/env'
import { TransactionQueue } from '@prosopo/tx'
import { defaultConfig } from '@prosopo/cli'
import { getPairAsync, oneUnit } from '@prosopo/contract'
import { setupDapp } from '../setup/index.js'
import mongoose, { Model } from 'mongoose'

const log = getLogger(LogLevel.enum.info, 'dev.deploy')

export interface Emails {
    email: string
    name: string
    url: string
    account: string
    mnemonic: string
    createdAt: number
    marketingPreferences: boolean
}

export const EmailModelSchema = new mongoose.Schema<Emails>(
    {
        email: String,
        name: String,
        url: String,
        account: String,
        mnemonic: String,
        createdAt: Number,
        marketingPreferences: Boolean,
    },
    { collection: 'emails' }
)

let EmailsModel: typeof Model<Emails>
try {
    EmailsModel = mongoose.model('emails')
} catch (error) {
    EmailsModel = mongoose.model('emails', EmailModelSchema)
}

export async function run(atlasUri: string | undefined) {
    if (!atlasUri) {
        throw new Error('Atlas URI not found in env')
    }

    await mongoose.connect(atlasUri, { dbName: 'prosopo' })
    const dapps = await EmailsModel.find({}).exec()
    log.info(dapps)
    const config = defaultConfig()
    const network = config.networks[config.defaultNetwork]
    const secret = config.account.secret
    const pair = await getPairAsync(network, secret)
    const env = new ProviderEnvironment(config, pair)
    await env.isReady()
    const queue = new TransactionQueue(env.getApi(), pair, config.logLevel)
    if (!config.account.address) {
        throw new Error('Account address not found in config')
    }
    if (!secret) {
        throw new Error('Account secret not found in config')
    }
    const fundAmount = oneUnit(env.getApi())
    await Promise.all(
        dapps
            .filter((dappRecord) => dappRecord.account)
            .map((dappRecord) => setupDapp(env, { pair, secret, fundAmount }, dappRecord.account, queue))
    )
}
