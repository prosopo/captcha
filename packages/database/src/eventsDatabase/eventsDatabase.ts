import { ProsopoEnvError, getLoggerDefault } from '@prosopo/common'
import { StoredEventRecord, StoredEvents } from '@prosopo/types'
import mongoose, { Model } from 'mongoose'
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

const addCaptchaEventRecord = async (record: StoredEventRecord): Promise<void> => {
    try {
        const newRecord = new CaptchaEvent(record)
        await newRecord.save()
        logger.info('Record added successfully')
    } catch (error) {
        logger.error('Error adding record to the database:', error)
    }
}

export const saveCaptchaEvent = async (events: StoredEvents, accountId: string, atlasUri: string) => {
    return new Promise((resolve, reject) => {
        const connection = mongoose.createConnection(atlasUri)
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            connection.once('open', resolve).on('error', (e) => {
                logger.warn(`Mongoose connection error`)
                logger.error(e)

                // Only reject on the last attempt, otherwise handle the retry logic
                if (attempt === MAX_RETRIES) {
                    reject(new ProsopoEnvError(e, 'DATABASE.CONNECT_ERROR', {}, atlasUri))
                } else {
                    // Remove the error listener to avoid accumulated listeners on retries
                    connection?.removeAllListeners('error')
                }
            })
        }

        const captchaEventData = {
            ...events,
            accountId,
        }

        addCaptchaEventRecord(captchaEventData)
            .then(() => logger.info('Captcha event data saved'))
            .catch((error) => logger.error('Error saving captcha event data:', error))
            .finally(() => connection.close())
    })
}
