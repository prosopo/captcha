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
import { Environment } from '../src/env'
import { sendFunds } from '../src/tasks/setup'

require('dotenv').config()

async function main(account: string) {
    const env = new Environment('//Alice')
    await env.isReady()
    await sendFunds(env, account, 'Provider', 100000000000000000n)
    process.exit()
}

main(process.argv.slice(2)[0].trim()).catch((error) => {
    console.error(error)
    process.exit()
})
