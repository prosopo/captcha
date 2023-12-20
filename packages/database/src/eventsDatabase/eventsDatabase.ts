import { StoredEvents } from '@prosopo/types'
import mongoose from 'mongoose'

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
            isShiftKey: Boolean,
            isCtrlKey: Boolean,
        },
    ],
    accountId: String,
})

const CaptchaEvent = mongoose.model('CaptchaEvent', captchaEventSchema)

const addCaptchaEventRecord = async (record: {
    touchEvents?: { x: number; y: number; timestamp: number }[]
    mouseEvents?: { x: number; y: number; timestamp: number }[]
    keyboardEvents?: { key: string; timestamp: number; isShiftKey?: boolean; isCtrlKey?: boolean }[]
    accountId: string
}): Promise<void> => {
    try {
        const newRecord = new CaptchaEvent(record)
        await newRecord.save()
        console.log('Record added successfully')
    } catch (error) {
        console.error('Error adding record to the database:', error)
    }
}

export const saveCaptchaEvent = async (events: StoredEvents, accountId: string, atlasUri: string) => {
    await mongoose
        .connect(atlasUri)
        .then(() => console.log('Connected to MongoDB Atlas'))
        .catch((err) => console.error('Error connecting to MongoDB:', err))

    const captchaEventData = {
        ...events,
        accountId,
    }

    addCaptchaEventRecord(captchaEventData)
        .then(() => console.log('Captcha event data saved'))
        .catch((error) => console.error('Error saving captcha event data:', error))
}
