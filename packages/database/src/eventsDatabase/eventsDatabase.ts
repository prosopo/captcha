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
import type { StoredEventRecord, StoredEvents } from '@prosopo/types'
import { getLoggerDefault } from '@prosopo/common'
import mongoose, { type Model } from 'mongoose'
const logger = getLoggerDefault()
const MAX_RETRIES = 3

const captchaEventSchema = new mongoose.Schema({
    touchEvents: [
        {
            x: Number,
            y: Number,
            timestamp: Number,
        },
    ],
    mouseEvents: [
        {
            x: Number,
            y: Number,
            timestamp: Number,
        },
    ],
    keyboardEvents: [
        {
            key: String,
            timestamp: Number,
            isShiftKey: { type: Boolean, required: false },
            isCtrlKey: { type: Boolean, required: false },
        },
    ],
    accountId: String,
})
let CaptchaEvent: typeof Model<StoredEventRecord>
try {
    CaptchaEvent = mongoose.model('CaptchaEvent')
} catch (error) {
    CaptchaEvent = mongoose.model('CaptchaEvent', captchaEventSchema)
}

export const saveCaptchaEvent = async (events: StoredEvents, accountId: string, atlasUri: string) => {
    await mongoose.connect(atlasUri).then(() => console.log('Connected to MongoDB Atlas'))

    const captchaEventData = {
        ...events,
        accountId,
    }

    await CaptchaEvent.create(captchaEventData)
    logger.info('Mongo Saved Events')
}
