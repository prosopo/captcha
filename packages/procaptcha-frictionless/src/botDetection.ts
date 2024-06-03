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
import { load } from '@fingerprintjs/botd'

export const botDetection = {
    detectBot: async () => {
        try {
            const botd = await load()
            const result = botd.detect()

            console.log(JSON.stringify(result))

            return result.bot
        } catch (error) {
            console.error('Error detecting bot:', error)
            return false
        }
    },
}
