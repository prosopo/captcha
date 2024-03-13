import { getLoggerDefault } from '@prosopo/common'
import type { StoredEventRecord, StoredEvents } from '@prosopo/types'
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

    const saved = await CaptchaEvent.create(captchaEventData)
    console.log('Mongo Saved Event', saved)
}
